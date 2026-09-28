import { useRef, useMemo, useEffect, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, PerformanceMonitor } from "@react-three/drei"
import { EffectComposer, Bloom, ToneMapping, SMAA } from "@react-three/postprocessing"
import { ToneMappingMode } from "postprocessing"
import * as THREE from "three"
import { Planet } from "./Planet"
import { Moons } from "./Moons"
import { RelatedArcs } from "./RelatedArcs"
import { blogData } from "./data"
import { computeLayout, orbitPosition, HOME_DIR } from "./layout"
import { planetRadius } from "./encoding"
import { ClusterNames } from "./ClusterNames"
import { Starfield } from "./Starfield"
import { Nebulae } from "./Nebula"
import { KEY_LIGHT_DIR } from "./planetMaterials"

// Scratch vectors (avoid per-frame allocs)
const _offset     = new THREE.Vector3()
const _right      = new THREE.Vector3()
const _up         = new THREE.Vector3(0, 1, 0)

// Mouse parallax: the camera orbits a few degrees toward the cursor, damped.
const PARALLAX_YAW   = THREE.MathUtils.degToRad(3)
const PARALLAX_PITCH = THREE.MathUtils.degToRad(2)
const PARALLAX_DAMP  = 2.5

const KEY_LIGHT_POS = KEY_LIGHT_DIR.clone().multiplyScalar(40)

// Software rasterizers can't sustain bloom; skip it outright there.
function isSoftwareRenderer(gl) {
  const ctx = gl.getContext()
  const info = ctx.getExtension("WEBGL_debug_renderer_info")
  const name = info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : ""
  return /swiftshader|llvmpipe|software|basic render/i.test(name)
}

const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2)

// Starts at 1x pixel ratio and steps up to the device's (capped at 2) only
// after ~3s of sustained 55+ fps. If the higher ratio then can't hold 50fps
// it drops back to 1x for good; a machine that can't hold 50fps at 1x loses
// bloom instead. Never oscillates between levels within a session. Sampling
// starts after a short warm-up so shader compilation doesn't count.
function useAdaptiveQuality() {
  const { gl, setDpr } = useThree()
  const dpr = useThree(s => s.viewport.dpr)
  const [bloom, setBloom] = useState(() => !isSoftwareRenderer(gl))
  const [monitoring, setMonitoring] = useState(false)
  const q = useRef({ steppedUp: false, locked: false })

  useEffect(() => {
    const t = setTimeout(() => setMonitoring(true), 1500)
    return () => clearTimeout(t)
  }, [])

  const onIncline = () => {
    if (q.current.steppedUp || q.current.locked || MAX_DPR <= 1) return
    q.current.steppedUp = true
    setDpr(MAX_DPR)
  }
  const onDecline = () => {
    if (q.current.steppedUp && !q.current.locked) { q.current.locked = true; setDpr(1); return }
    q.current.locked = true
    setBloom(false)
  }

  // Current quality level, readable from devtools or tests: data-quality on <canvas>
  useEffect(() => {
    gl.domElement.dataset.quality = `dpr=${dpr} bloom=${bloom} steppedUp=${q.current.steppedUp} locked=${q.current.locked}`
  }, [gl, dpr, bloom])
  return { bloom, dpr, monitoring, onIncline, onDecline }
}

// ─── Camera ──────────────────────────────────────────────────────────────────
// Home view: looking along HOME_DIR at the middle of the clusters, from just
// far enough that every cluster (outer orbit + planet) fits in the part of
// the viewport the right-hand panel leaves free. The projection gets a lens
// shift (setViewOffset) of half the panel width, so the scene is centred in
// the free area without re-aiming or distorting anything.
const FRAME_MARGIN = 0.86   // fraction of the free half-extent the scene may use
const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3()
const _p = new THREE.Vector3(), _rel = new THREE.Vector3()
const HOME = new THREE.Vector3(...HOME_DIR)

function computeHome(clusters, camera, width, height, inset) {
  _f.copy(HOME).negate()                                   // view direction
  _r.crossVectors(_f, _up).normalize()                     // screen right
  _u.crossVectors(_r, _f)                                  // screen up
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, sumD = 0
  for (const c of clusters) {
    _p.set(c.center.x, c.center.y, c.center.z)
    const x = _p.dot(_r), y = _p.dot(_u)
    minX = Math.min(minX, x - c.extent); maxX = Math.max(maxX, x + c.extent)
    minY = Math.min(minY, y - c.extent); maxY = Math.max(maxY, y + c.extent)
    sumD += _p.dot(HOME)
  }
  const target = new THREE.Vector3()
    .addScaledVector(_r, (minX + maxX) / 2)
    .addScaledVector(_u, (minY + maxY) / 2)
    .addScaledVector(HOME, sumD / clusters.length)

  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const tanH = tanV * (width / height)
  const freeX = Math.max(0.3, (width - inset) / width)
  let d = 10
  for (const c of clusters) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      _rel.set(c.center.x, c.center.y, c.center.z).sub(target)
        .addScaledVector(_r, Math.cos(a) * c.extent)
        .addScaledVector(_u, Math.sin(a) * c.extent)
      const depth = _rel.dot(HOME)
      d = Math.max(d,
        depth + Math.abs(_rel.dot(_r)) / (tanH * freeX * FRAME_MARGIN),
        depth + Math.abs(_rel.dot(_u)) / (tanV * FRAME_MARGIN))
    }
  }
  return { pos: target.clone().addScaledVector(HOME, d), target }
}

const MIN_DISTANCE = 3   // closest manual zoom

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutQuint   = t => 1 - Math.pow(1 - t, 5)

export function Scene({
  selected, flyTarget, enterTarget, returnNonce, onEnter,
  filteredIds, clusterFilter, focusedId, focusedRef, reducedMotion, rightInset = 0,
}) {
  const controlsRef = useRef()
  const { camera }  = useThree()
  const layout      = useMemo(() => computeLayout(), [])
  const { bloom, dpr, monitoring, onIncline, onDecline } = useAdaptiveQuality()
  const size = useThree(s => s.size)

  // @react-three/postprocessing only resizes its buffers when the canvas's
  // CSS size changes, not its pixel ratio — without this, dropping to 1x
  // still renders bloom at the old resolution and saves nothing.
  const composerRef = useRef()
  useEffect(() => { composerRef.current?.setSize(size.width, size.height) }, [dpr, size])

  // ── Orbital drift ─────────────────────────────────────────────────────────
  // One Vector3 per visible planet, updated in place every frame; planets,
  // moons and related arcs read from it. Drift time slows to a stop while
  // anything is hovered, focused or selected, or the camera is moving to a
  // planet, so a body never slides out from under the cursor.
  const live = useMemo(() => {
    const m = new Map()
    for (const [id, orbit] of Object.entries(layout.orbits)) m.set(id, orbitPosition(orbit, 0, new THREE.Vector3()))
    return m
  }, [layout])
  const articles = useMemo(() => blogData.nodes.filter(n => live.has(n.id)), [live])

  // ── Activity: which planets currently show their moons / related arcs ────
  // Hovered, focused or selected planets, plus the planet whose moon is under
  // the pointer. Leaving a planet keeps it active for a short linger so the
  // pointer can cross the gap to its moons.
  const LINGER_MS = 700
  const hoveredRef   = useRef(null)          // planet under the pointer
  const moonHoverRef = useRef(null)          // article whose moon is under the pointer
  const lingerRef    = useRef({ id: null, until: 0 })
  const onHoverChange = id => {
    if (!id && hoveredRef.current) lingerRef.current = { id: hoveredRef.current, until: performance.now() + LINGER_MS }
    hoveredRef.current = id
  }
  const onMoonHoverChange = moon => {
    if (!moon && moonHoverRef.current) lingerRef.current = { id: moonHoverRef.current, until: performance.now() + LINGER_MS }
    moonHoverRef.current = moon?.article ?? null
  }
  const propsRef = useRef()
  propsRef.current = { selectedId: selected?.id, focusedId }
  const isActive = useMemo(() => id => {
    const { selectedId, focusedId } = propsRef.current
    const linger = lingerRef.current
    return id === hoveredRef.current || id === moonHoverRef.current || id === selectedId || id === focusedId
      || (id === linger.id && performance.now() < linger.until)
  }, [])

  // ── Camera tweens ─────────────────────────────────────────────────────────
  // One tween at a time: home framing, visiting a planet (highlights), flying
  // into a planet (opening the reader) and flying back out. Destinations may
  // be functions, re-evaluated every frame, so a drifting planet is tracked.
  // Reduced motion makes every tween instant.
  const tween     = useRef(null)
  const homeRef   = useRef({ active: true })          // camera is at the home view
  const savedView = useRef(null)                      // where to return from the reader
  // From the moment a fly-in starts until the flight back out ends: no
  // planet/moon labels, and moons fade away rather than loom at close range
  const [flying, setFlying] = useState(false)
  const insetRef  = useRef(rightInset)
  insetRef.current = rightInset

  const home = () => computeHome(layout.clusters, camera, size.width, size.height, insetRef.current)
  const startTween = (to, { duration, ease = easeInOutCubic, onDone } = {}) => {
    tween.current = {
      fromPos: camera.position.clone(),
      fromTarget: controlsRef.current.target.clone(),
      to, t: 0, duration: reducedMotion ? 0 : duration, ease, onDone,
    }
  }

  // Lens shift + home framing; re-run on resize and when the panel changes.
  useEffect(() => {
    if (rightInset > 0) camera.setViewOffset(size.width, size.height, rightInset / 2, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    if (!controlsRef.current) return
    const h = home()
    controlsRef.current.maxDistance = Math.max(55, h.pos.distanceTo(h.target) + 15)
    if (!camera.userData.framed) {
      camera.position.copy(h.pos)
      controlsRef.current.target.copy(h.target)
      camera.userData.framed = true
    } else if (homeRef.current.active && !tween.current) {
      startTween(() => home(), { duration: 0.7 })
    }
  }, [size.width, size.height, rightInset])

  // Any manual orbit/zoom/pan leaves the home view (and cancels a tween)
  useEffect(() => {
    const c = controlsRef.current
    const leaveHome = () => { homeRef.current.active = false; tween.current = null }
    c.addEventListener("start", leaveHome)
    return () => c.removeEventListener("start", leaveHome)
  }, [])

  // Visit (highlights): stop in front of the planet, a few units out.
  useEffect(() => {
    if (!flyTarget || !live.has(flyTarget)) return
    homeRef.current.active = false
    const pos = live.get(flyTarget)
    startTween(() => ({ pos: pos.clone().addScaledVector(HOME, 9.5), target: pos }), { duration: 1.25, ease: easeOutQuint })
  }, [flyTarget])

  // Enter: fly into the planet until it fills the screen (App fades to the
  // reader over the last part), remembering the view to come back to.
  useEffect(() => {
    if (!enterTarget || !live.has(enterTarget.id)) return
    savedView.current = {
      pos: camera.position.clone().sub(parallax.current.applied),
      target: controlsRef.current.target.clone(),
      home: homeRef.current.active,
    }
    homeRef.current.active = false
    setFlying(true)
    const pos = live.get(enterTarget.id)
    const R = planetRadius(blogData.nodes.find(n => n.id === enterTarget.id).readTime)
    const approach = camera.position.clone().sub(pos).normalize()
    // Let the camera get closer than the controls' usual zoom limit
    controlsRef.current.minDistance = R * 1.1
    startTween(() => ({ pos: pos.clone().addScaledVector(approach, R * 1.2), target: pos }), { duration: 1.1 })
  }, [enterTarget])

  // Return from the reader: reverse the flight back to the saved view (or to
  // a freshly framed home view, if that's where we left from).
  useEffect(() => {
    if (!returnNonce || !savedView.current) return
    const saved = savedView.current
    savedView.current = null
    startTween(saved.home ? () => home() : { pos: saved.pos, target: saved.target }, {
      duration: 1.0,
      onDone: () => {
        setFlying(false)
        homeRef.current.active = saved.home
        controlsRef.current.minDistance = MIN_DISTANCE
      },
    })
  }, [returnNonce])

  const drift = useRef({ t: 0, speed: reducedMotion ? 0 : 1 })
  const paused = !!(selected || focusedId)
  useFrame((_, dt) => {
    const d = drift.current
    const goal = (reducedMotion || paused || hoveredRef.current || moonHoverRef.current || tween.current) ? 0 : 1
    d.speed += (goal - d.speed) * (1 - Math.exp(-dt * 6))
    d.t += dt * d.speed
    for (const [id, orbit] of Object.entries(layout.orbits)) orbitPosition(orbit, d.t, live.get(id))
  }, -3)

  // Dev-only handle for automated checks
  useEffect(() => {
    if (import.meta.env.DEV) window.__universe = { camera, controls: controlsRef, live, drift, layout, homeRef, tween }
  })

  const connectedIds = useMemo(() => {
    if (!selected) return new Set()
    const ids = new Set([selected.id])
    blogData.edges.forEach(e => {
      if (e.source === selected.id) ids.add(e.target)
      if (e.target === selected.id) ids.add(e.source)
    })
    return ids
  }, [selected])

  // ── Mouse parallax ────────────────────────────────────────────────────────
  // Applied after OrbitControls each frame and removed before its next
  // update, so the controls never see (or accumulate) the offset. Held still
  // while dragging, and off entirely under reduced motion.
  const parallax = useRef({ x: 0, y: 0, applied: new THREE.Vector3(), dragging: false })
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const start = () => { parallax.current.dragging = true }
    const end   = () => { parallax.current.dragging = false }
    c.addEventListener("start", start)
    c.addEventListener("end", end)
    return () => { c.removeEventListener("start", start); c.removeEventListener("end", end) }
  }, [])
  useFrame(() => {
    camera.position.sub(parallax.current.applied)
    parallax.current.applied.set(0, 0, 0)
  }, -2)

  const hasFilter = filteredIds !== null

  useFrame((state, dt) => {
    const tw = tween.current
    if (tw && controlsRef.current) {
      tw.t = tw.duration > 0 ? Math.min(tw.t + dt / tw.duration, 1) : 1
      const to = typeof tw.to === "function" ? tw.to() : tw.to
      const e = tw.ease(tw.t)
      camera.position.lerpVectors(tw.fromPos, to.pos, e)
      controlsRef.current.target.lerpVectors(tw.fromTarget, to.target, e)
      if (tw.t >= 1) { tween.current = null; tw.onDone?.() }
    }

    // Parallax, last: orbit the camera a few degrees about the controls target
    const p = parallax.current
    if (!reducedMotion && controlsRef.current) {
      if (!p.dragging) {
        const k = 1 - Math.exp(-dt * PARALLAX_DAMP)
        p.x += (state.pointer.x - p.x) * k
        p.y += (state.pointer.y - p.y) * k
      }
      const target = controlsRef.current.target
      _offset.copy(camera.position).sub(target)
      _offset.applyAxisAngle(_up, p.x * PARALLAX_YAW)
      _right.crossVectors(_up, _offset).normalize()
      _offset.applyAxisAngle(_right, p.y * PARALLAX_PITCH)
      p.applied.copy(target).add(_offset).sub(camera.position)
      camera.position.add(p.applied)
      camera.lookAt(target)
    }
  })

  return (
    <>
      <color attach="background" args={["#05050f"]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={KEY_LIGHT_POS} intensity={2.2} />

      <Starfield reducedMotion={reducedMotion} />

      <OrbitControls
        ref={controlsRef}
        enablePan enableZoom enableRotate
        minDistance={MIN_DISTANCE} maxDistance={55}
        dampingFactor={0.07} enableDamping
      />

      <group>
        <Nebulae clusters={layout.clusters} filteredIds={filteredIds} reducedMotion={reducedMotion} />
        <ClusterNames clusters={layout.clusters} highlighted={clusterFilter} hidden={flying} />

        {/* Resting state shows planets only; moons and related arcs appear
            for active planets */}
        <RelatedArcs live={live} articles={articles} isActive={isActive} reducedMotion={reducedMotion} />
        <Moons live={live} articles={articles} isActive={isActive} focusedRef={focusedRef} suppressed={flying}
          onHoverChange={onMoonHoverChange} reducedMotion={reducedMotion} />

        {articles.map(node => {
          const livePos = live.get(node.id)
          const filterFaded = hasFilter && !filteredIds.has(node.id)
          const selectFaded = !!(selected && !connectedIds.has(node.id))
          const fade = (filterFaded || selectFaded) ? "hard" : "none"
          const isSelected    = selected?.id === node.id
          const isHighlighted = !!(selected && connectedIds.has(node.id) && node.id !== selected.id)

          return (
            <Planet
              key={node.id}
              node={node}
              livePos={livePos}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              isFocused={focusedId === node.id}
              fade={fade}
              onOpen={onEnter}
              labelsHidden={flying}
              onHoverChange={onHoverChange}
              reducedMotion={reducedMotion}
            />
          )
        })}
      </group>

      {/* 12 samples x 250ms: inclines when >75% of ~3s is at 55+ fps,
          declines when >75% is under 50 */}
      {monitoring && (
        <PerformanceMonitor iterations={12} bounds={() => [50, 55]} onIncline={onIncline} onDecline={onDecline} />
      )}

      {/* Bloom only catches HDR values: star surfaces, coronas and the rims
          of recent planets. Lit surfaces stay below the threshold, so
          planets keep crisp edges instead of turning into blurry blobs.
          SMAA instead of MSAA: 4x multisampling on the half-float buffers
          cost ~12fps on an Intel UHD 620; SMAA costs ~0. */}
      {bloom && (
        <EffectComposer ref={composerRef} multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.9} radius={0.6} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  )
}

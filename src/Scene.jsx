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
import { computeLayout, orbitPosition } from "./layout"
import { Starfield } from "./Starfield"
import { Nebulae } from "./Nebula"
import { KEY_LIGHT_DIR } from "./planetMaterials"

// Camera position and its look-at target are shifted by the same amount on
// X — a pure lateral pan, not a re-aim — so the universe renders shifted
// left on screen (to sit more centered in the space left of the Highlights
// panel) without introducing any perspective distortion.
const HOME_SHIFT_X       = 4
const DEFAULT_CAM_POS    = new THREE.Vector3(4 + HOME_SHIFT_X, 14, 28)
const DEFAULT_CAM_TARGET = new THREE.Vector3(0 + HOME_SHIFT_X, -1, 0)

// Scratch vectors (avoid per-frame allocs)
const _flyTarget  = new THREE.Vector3()
const _flyCamDest = new THREE.Vector3()
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

export function Scene({ selected, onSelect, flyTarget, filteredIds, focusedId, focusedRef, reducedMotion }) {
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

  useEffect(() => {
    camera.position.copy(DEFAULT_CAM_POS)
    if (controlsRef.current) controlsRef.current.target.copy(DEFAULT_CAM_TARGET)
  }, [])

  // ── Orbital drift ─────────────────────────────────────────────────────────
  // One Vector3 per visible planet, updated in place every frame; planets,
  // moons and related arcs read from it. Drift time slows to a stop while
  // anything is hovered, focused or selected, so a body never slides out
  // from under the cursor.
  const live = useMemo(() => {
    const m = new Map()
    for (const [id, orbit] of Object.entries(layout.orbits)) m.set(id, orbitPosition(orbit, 0, new THREE.Vector3()))
    return m
  }, [layout])
  const articles = useMemo(() => blogData.nodes.filter(n => live.has(n.id)), [live])
  // Dev-only handle for automated checks (camera, controls, live positions)
  useEffect(() => {
    if (import.meta.env.DEV) window.__universe = { camera, controls: controlsRef, live, drift }
  })

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
  const drift = useRef({ t: 0, speed: reducedMotion ? 0 : 1 })

  const paused = !!(selected || focusedId)
  useFrame((_, dt) => {
    const d = drift.current
    const goal = (reducedMotion || paused || hoveredRef.current || moonHoverRef.current) ? 0 : 1
    d.speed += (goal - d.speed) * (1 - Math.exp(-dt * 6))
    d.t += dt * d.speed
    for (const [id, orbit] of Object.entries(layout.orbits)) orbitPosition(orbit, d.t, live.get(id))
  }, -3)

  const connectedIds = useMemo(() => {
    if (!selected) return new Set()
    const ids = new Set([selected.id])
    blogData.edges.forEach(e => {
      if (e.source === selected.id) ids.add(e.target)
      if (e.target === selected.id) ids.add(e.source)
    })
    return ids
  }, [selected])

  const flyRef = useRef(null)
  useMemo(() => {
    if (!flyTarget) { flyRef.current = null; return }
    if (!live.has(flyTarget)) return
    flyRef.current = {
      nodeId:      flyTarget,
      startPos:    camera.position.clone(),
      startTarget: controlsRef.current
        ? controlsRef.current.target.clone()
        : DEFAULT_CAM_TARGET.clone(),
      t: 0,
    }
  }, [flyTarget])

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
    // Fly-to — easeOutQuint: decelerates like falling into a gravity well.
    // The destination is recomputed each frame from the body's live position,
    // so it lands dead-center even though the planet is drifting.
    // Reduced motion jumps straight to the destination.
    if (flyRef.current) {
      const pos = live.get(flyRef.current.nodeId)
      _flyTarget.copy(pos)
      _flyCamDest.set(_flyTarget.x, _flyTarget.y + 3, _flyTarget.z + 9)

      flyRef.current.t = reducedMotion ? 1 : Math.min(flyRef.current.t + dt * 0.8, 1)
      const ease = 1 - Math.pow(1 - flyRef.current.t, 5)
      camera.position.lerpVectors(flyRef.current.startPos, _flyCamDest, ease)
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(flyRef.current.startTarget, _flyTarget, ease)
      }
      if (flyRef.current.t >= 1) flyRef.current = null
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
        minDistance={3} maxDistance={55}
        dampingFactor={0.07} enableDamping
        target={DEFAULT_CAM_TARGET}
      />

      <group>
        <Nebulae clusters={layout.clusters} filteredIds={filteredIds} reducedMotion={reducedMotion} />

        {/* Resting state shows planets only; moons and related arcs appear
            for active planets */}
        <RelatedArcs live={live} articles={articles} isActive={isActive} reducedMotion={reducedMotion} />
        <Moons live={live} articles={articles} isActive={isActive} focusedRef={focusedRef}
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
              onSelect={onSelect}
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

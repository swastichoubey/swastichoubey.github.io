import { useRef, useMemo, useEffect, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, PerformanceMonitor } from "@react-three/drei"
import { EffectComposer, Bloom, ToneMapping, SMAA } from "@react-three/postprocessing"
import { ToneMappingMode } from "postprocessing"
import * as THREE from "three"
import { Node } from "./Node"
import { Planet } from "./Planet"
import { Edge } from "./Edge"
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

// Degrades in steps when frame rate stays low: first render at 1x pixel
// ratio, then drop bloom. Never climbs back within a session, so the scene
// doesn't oscillate between quality levels.
function useAdaptiveQuality() {
  const { gl, setDpr } = useThree()
  const [bloom, setBloom] = useState(() => !isSoftwareRenderer(gl))
  const declines = useRef(0)
  const dpr = useThree(s => s.viewport.dpr)
  const onDecline = () => {
    declines.current += 1
    if (declines.current === 1) setDpr(1)
    else setBloom(false)
  }
  // Current quality level, readable from devtools or tests: data-quality on <canvas>
  useEffect(() => { gl.domElement.dataset.quality = `dpr=${dpr} bloom=${bloom} declines=${declines.current}` }, [gl, dpr, bloom])
  return { bloom, dpr, onDecline }
}

export function Scene({ selected, onSelect, flyTarget, filteredIds, focusedId, reducedMotion }) {
  const groupRef    = useRef()
  const controlsRef = useRef()
  const spinRef     = useRef(reducedMotion ? 0 : 0.022)   // eased auto-rotation speed
  const { camera }  = useThree()
  const layout      = useMemo(() => computeLayout(), [])
  const { bloom, dpr, onDecline } = useAdaptiveQuality()
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
  // One Vector3 per visible body, updated in place every frame; planets,
  // reference dots and edges read from it. Drift time slows to a stop while
  // anything is hovered, focused or selected, so a body never slides out
  // from under the cursor.
  const live = useMemo(() => {
    const m = new Map()
    for (const [id, orbit] of Object.entries(layout.orbits)) m.set(id, orbitPosition(orbit, 0, new THREE.Vector3()))
    for (const [id, off] of Object.entries(layout.refOffsets)) m.set(id, m.get(off.parent).clone().add(off))
    return m
  }, [layout])
  // Dev-only handle for automated checks (camera, controls, live positions)
  useEffect(() => {
    if (import.meta.env.DEV) window.__universe = { camera, controls: controlsRef, live, drift }
  })

  const hoveredRef = useRef(null)
  const onHoverChange = id => { hoveredRef.current = id }
  const drift = useRef({ t: 0, speed: reducedMotion ? 0 : 1 })

  const paused = !!(selected || focusedId)
  useFrame((_, dt) => {
    const d = drift.current
    const goal = (reducedMotion || paused || hoveredRef.current) ? 0 : 1
    d.speed += (goal - d.speed) * (1 - Math.exp(-dt * 6))
    d.t += dt * d.speed
    for (const [id, orbit] of Object.entries(layout.orbits)) orbitPosition(orbit, d.t, live.get(id))
    for (const [id, off] of Object.entries(layout.refOffsets)) live.get(id).copy(live.get(off.parent)).add(off)
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
    // Auto-rotation eases to a stop during selection/fly/hover instead of snapping
    const spinTarget = (!selected && !flyRef.current && !reducedMotion && !hoveredRef.current && !focusedId) ? 0.022 : 0
    spinRef.current += (spinTarget - spinRef.current) * (1 - Math.exp(-dt * 3))
    if (groupRef.current) groupRef.current.rotation.y += dt * spinRef.current

    // Fly-to — easeOutQuint: decelerates like falling into a gravity well.
    // The destination is recomputed each frame from the body's live position
    // rotated by the scene group's current spin, so it lands dead-center even
    // if the universe was mid-rotation when clicked.
    // Reduced motion jumps straight to the destination.
    if (flyRef.current) {
      const pos = live.get(flyRef.current.nodeId)
      const ry  = groupRef.current ? groupRef.current.rotation.y : 0
      const cos = Math.cos(ry), sin = Math.sin(ry)
      _flyTarget.set(pos.x * cos + pos.z * sin, pos.y, -pos.x * sin + pos.z * cos)
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

      <group ref={groupRef}>
        <Nebulae clusters={layout.clusters} filteredIds={filteredIds} reducedMotion={reducedMotion} />

        {/* Edges */}
        {blogData.edges.map((edge, i) => {
          const sp = live.get(edge.source)
          const ep = live.get(edge.target)
          if (!sp || !ep) return null

          // Filter: fade if either endpoint is filtered out
          const filterFade = hasFilter && (
            !filteredIds.has(edge.source) || !filteredIds.has(edge.target)
          )
          // Select: fade edges not in selection neighbourhood
          const selectFade = selected && (
            !connectedIds.has(edge.source) || !connectedIds.has(edge.target)
          )
          const isH = !!(selected && connectedIds.has(edge.source) && connectedIds.has(edge.target))
          const fade = (filterFade || selectFade) ? "hard" : "none"

          return <Edge key={i} start={sp} end={ep} isHighlighted={isH} fade={fade} />
        })}

        {/* Planets and reference dots */}
        {blogData.nodes.map(node => {
          const livePos = live.get(node.id)
          if (!livePos) return null

          const filterFaded = hasFilter && !filteredIds.has(node.id)
          const selectFaded = !!(selected && !connectedIds.has(node.id))
          const fade = (filterFaded || selectFaded) ? "hard" : "none"
          const isSelected    = selected?.id === node.id
          const isHighlighted = !!(selected && connectedIds.has(node.id) && node.id !== selected.id)

          const Body = node.type === "ref" ? Node : Planet
          return (
            <Body
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

      {/* Declines when most samples over ~2.5s fall under 50fps (60Hz) */}
      <PerformanceMonitor onDecline={onDecline} bounds={rate => rate > 100 ? [60, 100] : [50, 60]} />

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

import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars } from "@react-three/drei"
import * as THREE from "three"
import { Node } from "./Node"
import { Edge } from "./Edge"
import { AboutSpokes } from "./AboutSpokes"
import { blogData } from "./data"
import { computeLayout } from "./layout"

const DEFAULT_CAM_POS    = new THREE.Vector3(4, 14, 28)
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, -1, 0)

// Scratch vectors for the per-frame fly-to destination (avoid per-frame allocs)
const _flyTarget  = new THREE.Vector3()
const _flyCamDest = new THREE.Vector3()

export function Scene({ selected, onSelect, flyTarget, filteredIds, aboutExpanded, aboutView, onSpokeClick }) {
  const groupRef    = useRef()
  const controlsRef = useRef()
  const spinRef     = useRef(0.022)   // eased auto-rotation speed
  const { camera }  = useThree()
  const positions   = useMemo(() => computeLayout(), [])

  useEffect(() => {
    camera.position.copy(DEFAULT_CAM_POS)
    if (controlsRef.current) controlsRef.current.target.copy(DEFAULT_CAM_TARGET)
  }, [])

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
    if (!positions[flyTarget]) return
    flyRef.current = {
      nodeId:      flyTarget,
      startPos:    camera.position.clone(),
      startTarget: controlsRef.current
        ? controlsRef.current.target.clone()
        : DEFAULT_CAM_TARGET.clone(),
      t: 0,
    }
  }, [flyTarget])

  const hasFilter     = filteredIds !== null
  const aboutFadeAll  = aboutExpanded && !selected  // when about open, dim everything else

  useFrame((_, dt) => {
    // Auto-rotation eases to a stop during selection/fly instead of snapping
    const spinTarget = (!selected && !flyRef.current && !aboutExpanded) ? 0.022 : 0
    spinRef.current += (spinTarget - spinRef.current) * (1 - Math.exp(-dt * 3))
    if (groupRef.current) groupRef.current.rotation.y += dt * spinRef.current

    // Fly-to — easeOutQuint: decelerates like falling into a gravity well.
    // The destination is recomputed each frame from the node's layout position
    // rotated by the scene group's current spin, so the body lands dead-center
    // in the viewport even if the universe was mid-rotation when clicked.
    if (flyRef.current) {
      const pos = positions[flyRef.current.nodeId]
      const ry  = groupRef.current ? groupRef.current.rotation.y : 0
      const cos = Math.cos(ry), sin = Math.sin(ry)
      _flyTarget.set(pos.x * cos + pos.z * sin, pos.y, -pos.x * sin + pos.z * cos)
      _flyCamDest.set(_flyTarget.x, _flyTarget.y + 3, _flyTarget.z + 9)

      flyRef.current.t = Math.min(flyRef.current.t + dt * 0.8, 1)
      const ease = 1 - Math.pow(1 - flyRef.current.t, 5)
      camera.position.lerpVectors(flyRef.current.startPos, _flyCamDest, ease)
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(flyRef.current.startTarget, _flyTarget, ease)
      }
      if (flyRef.current.t >= 1) flyRef.current = null
    }
  })

  const aboutPos = positions["about"] || { x: 0, y: 0, z: 0 }

  return (
    <>
      <color attach="background" args={["#05050f"]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[12, 10, 8]}    intensity={1.4} color="#a78bfa" />
      <pointLight position={[-12, -6, -10]} intensity={0.7} color="#34d399" />
      <pointLight position={[0, 18, 0]}     intensity={0.4} color="#f8fafc" />

      <Stars radius={90} depth={60} count={4000} factor={3.5} saturation={0} fade speed={0.4} />

      <OrbitControls
        ref={controlsRef}
        enablePan enableZoom enableRotate
        minDistance={3} maxDistance={55}
        dampingFactor={0.07} enableDamping
        target={DEFAULT_CAM_TARGET}
      />

      <group ref={groupRef}>
        {/* Edges */}
        {blogData.edges.map((edge, i) => {
          const sp = positions[edge.source]
          const ep = positions[edge.target]
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
          // About-mode is a soft dim (-60%); filter/selection is a hard fade
          const fade = (filterFade || selectFade) ? "hard" : aboutFadeAll ? "soft" : "none"

          return <Edge key={i} start={sp} end={ep} isHighlighted={isH} fade={fade} />
        })}

        {/* Nodes */}
        {blogData.nodes.map(node => {
          const pos = positions[node.id]
          if (!pos) return null

          // Filter fade: about node fades with everything when filter is active
          const filterFaded = hasFilter && !filteredIds.has(node.id)

          // About-expanded: soft dim (-60%) for everything except About itself —
          // the About planet and its moons stay at full presence
          const aboutFaded = aboutFadeAll && node.id !== "about"

          // Select fade: everything not connected to selected node
          const selectFaded = !!(selected && !connectedIds.has(node.id))

          const fade = (filterFaded || selectFaded) ? "hard"
            : aboutFaded ? "soft"
            : "none"
          const isSelected    = selected?.id === node.id
          const isHighlighted = !!(selected && connectedIds.has(node.id) && node.id !== selected.id)

          return (
            <Node
              key={node.id}
              node={node}
              position={pos}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              fade={fade}
              onSelect={onSelect}
            />
          )
        })}

        {/* About moons — clickable, each opens its tab in the panel */}
        <AboutSpokes
          centerPos={aboutPos}
          expanded={aboutExpanded}
          activeView={aboutView}
          onSpokeClick={onSpokeClick}
        />
      </group>
    </>
  )
}

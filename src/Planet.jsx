import { useRef, useState, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { Html, Billboard } from "@react-three/drei"
import * as THREE from "three"
import { THEME, TYPE_LABELS } from "./theme"
import { planetRadius, recencyGlow } from "./encoding"
import { GRAPH } from "./graph.generated"
import {
  createPlanetMaterial, createRingMaterial, createCoronaMaterial, RING_INNER, RING_OUTER,
} from "./planetMaterials"

const SPHERE     = new THREE.SphereGeometry(1, 64, 48)
const RING       = new THREE.RingGeometry(RING_INNER, RING_OUTER, 128, 1)
const QUAD       = new THREE.PlaneGeometry(1, 1)
const FOCUS_RING = new THREE.RingGeometry(1.3, 1.38, 64)
const noRaycast  = () => null

// fade: "none" | "hard" (filter/selection fade)
const FADE_OPACITY = { none: 1.0, hard: 0.18 }

// Stable per-article randomness (band phase, crater layout, axial tilt).
function seedFrom(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}

const _center = new THREE.Vector3()
const HAS_MOONS = new Set(GRAPH.citations.map(c => c.article))

// livePos: a Vector3 the scene updates every frame (orbital drift)
// onOpen: clicking a planet opens its article (App flies the camera in first)
export function Planet({ node, livePos, isSelected, isHighlighted, isFocused, fade = "none", onOpen, onHoverChange, reducedMotion }) {
  const groupRef = useRef()
  const scaleRef = useRef()
  const spinRef  = useRef()
  const [hovered, setHovered] = useState(false)

  const color  = THEME[node.type]
  const radius = planetRadius(node.readTime)
  const seed   = useMemo(() => seedFrom(node.id), [node.id])
  const glow   = useMemo(() => recencyGlow(node.date), [node.date])
  const tilt   = (seed - 0.5) * 0.5

  const material = useMemo(() => createPlanetMaterial(node.type, { color, glow, seed }), [node.type, color, glow, seed])
  const ring     = useMemo(() => node.type === "project" ? createRingMaterial({ color, seed }) : null, [node.type, color, seed])
  const corona   = useMemo(() => node.type === "opinion" ? createCoronaMaterial({ color, glow }) : null, [node.type, color, glow])
  useEffect(() => () => { material.dispose(); ring?.dispose(); corona?.dispose() }, [material, ring, corona])

  const active        = hovered || isSelected || isFocused
  const targetScale   = active ? 1.12 : 1.0
  const targetOpacity = FADE_OPACITY[fade] ?? 1

  // Exponential damping instead of springs: uniforms aren't spring targets,
  // and this keeps scale, hover glow and fade on one clock.
  useFrame((_, dt) => {
    const kFast = 1 - Math.exp(-dt * 10)
    const kFade = 1 - Math.exp(-dt * 6)
    const u = material.uniforms
    groupRef.current.position.copy(livePos)
    const s = scaleRef.current.scale.x + (targetScale - scaleRef.current.scale.x) * kFast
    scaleRef.current.scale.setScalar(s)
    u.uHover.value   += ((active ? 1 : 0) - u.uHover.value) * kFast
    u.uOpacity.value += (targetOpacity - u.uOpacity.value) * kFade

    if (!reducedMotion) {
      u.uTime.value += dt
      spinRef.current.rotation.y += dt * 0.08
    }
    if (ring) {
      scaleRef.current.getWorldPosition(_center)
      ring.uniforms.uPlanetCenter.value.copy(_center)
      ring.uniforms.uPlanetRadius.value = radius * s
      ring.uniforms.uOpacity.value = u.uOpacity.value
    }
    if (corona) {
      corona.uniforms.uOpacity.value = u.uOpacity.value
      corona.uniforms.uTime.value = u.uTime.value
    }
  })

  const showLabel = hovered || isSelected || isHighlighted || isFocused

  return (
    <group ref={groupRef} position={livePos}>
      <group ref={scaleRef}>
        <group rotation-z={tilt}>
          <mesh
            ref={spinRef}
            geometry={SPHERE}
            material={material}
            scale={radius}
            onClick={e => { e.stopPropagation(); onOpen(node) }}
            onPointerOver={e => { e.stopPropagation(); setHovered(true); onHoverChange?.(node.id); document.body.style.cursor = "pointer" }}
            onPointerOut={() => { setHovered(false); onHoverChange?.(null); document.body.style.cursor = "default" }}
          />
        </group>

        {ring && (
          <mesh geometry={RING} material={ring} scale={radius}
            rotation={[Math.PI * 0.42, 0.2, 0]} raycast={noRaycast} />
        )}

        {corona && (
          <Billboard>
            <mesh geometry={QUAD} material={corona} scale={radius * 3.2} raycast={noRaycast} />
          </Billboard>
        )}

        {/* Keyboard focus indicator */}
        {isFocused && (
          <Billboard>
            <mesh geometry={FOCUS_RING} scale={radius} raycast={noRaycast}>
              <meshBasicMaterial color="#f8fafc" toneMapped={false} />
            </mesh>
          </Billboard>
        )}
      </group>

      {/* In-world label: constant size on screen, hanging down from just
          under the planet — or under its moon ring, when it has one — so it
          never covers the planet or its moons. */}
      {showLabel && (
        <Html position={[0, -(HAS_MOONS.has(node.id) ? radius * 1.6 + 1.0 : radius * 1.18), 0]} zIndexRange={[50, 60]} style={{ pointerEvents: "none" }}>
          <div style={{
            transform: "translate(-50%, 6px)",
            width: "max-content", maxWidth: "240px",
            padding: "5px 10px",
            background: "rgba(9, 11, 26, 0.9)",
            border: `1px solid ${color}55`,
            borderRadius: "8px",
            fontFamily: "'DM Mono', monospace",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "11px", color: "#f1f5f9", lineHeight: 1.35, letterSpacing: "0.02em" }}>
              {node.title}
            </div>
            <div style={{ fontSize: "9px", color: "#aab4c3", marginTop: "3px", letterSpacing: "0.08em" }}>
              <span style={{ color }}>{TYPE_LABELS[node.type]}</span> · {node.date}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

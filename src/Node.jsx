import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { useSpring, animated } from "@react-spring/three"
import * as THREE from "three"
import { THEME, TYPE_LABELS } from "./theme"
import { glassChip } from "./glass"

function nodeColor(node) {
  if (node.type === "ref")   return THEME.ref
  if (node.type === "about") return THEME.about
  return THEME[node.type] || "#ffffff"
}

// fade: "none" | "soft" (about-mode dim, -60%) | "hard" (filter/selection fade)
const FADE_OPACITY = { none: 1.0, soft: 0.4, hard: 0.18 }
const HALO_FADE    = { none: null, soft: 0.04, hard: 0.02 }

export function Node({ node, position, isSelected, isHighlighted, fade = "none", onSelect }) {
  const meshRef  = useRef()
  const ringRef  = useRef()
  const [hovered, setHovered] = useState(false)

  const isDraft = node.draft === true
  const isAbout = node.type === "about"
  const isRef   = node.type === "ref"
  const isMain  = !isRef && !isAbout

  const color = useMemo(() => nodeColor(node), [node])

  const size = isAbout ? 0.80 : isMain ? 0.58 : 0.24

  const targetScale   = (hovered || isSelected) ? 1.28 : 1.0
  const targetOpacity = isDraft
    ? Math.min(0.22, FADE_OPACITY[fade])
    : FADE_OPACITY[fade]
  const haloTarget = isDraft
    ? 0.02
    : HALO_FADE[fade] ?? (isSelected ? 0.18 : THEME.haloOpacity)
  const ringTarget = isDraft
    ? 0.04
    : fade !== "none" ? (fade === "soft" ? 0.09 : 0.04)
    : isSelected ? 0.45 : 0.22

  // Springs — scale gets a touch of overshoot so hovers feel alive;
  // opacity is critically damped so fades never flicker.
  const { scale } = useSpring({
    scale: targetScale,
    config: { mass: 0.9, tension: 380, friction: 22 },
  })
  const { opacity, haloOpacity, ringOpacity } = useSpring({
    opacity: targetOpacity,
    haloOpacity: haloTarget,
    ringOpacity: ringTarget,
    config: { mass: 1, tension: 200, friction: 30 },
  })

  useFrame((_, dt) => {
    if (!meshRef.current) return
    if (!isRef) meshRef.current.rotation.y += dt * (isAbout ? 0.15 : 0.25)
    if (ringRef.current) ringRef.current.rotation.z = Math.sin(Date.now() * 0.0003) * 0.04
  })

  const emissiveInt = (hovered || isSelected)
    ? THEME.emissiveHover
    : isRef ? THEME.emissiveRef : THEME.emissiveMain

  const canClick = !isDraft

  // Show label on hover OR when this node is highlighted by selection
  const showLabel = hovered || isSelected || isHighlighted

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Atmosphere halo */}
      {!isRef && (
        <mesh>
          <sphereGeometry args={[size * 1.55, 16, 16]} />
          <animated.meshBasicMaterial
            color={color} transparent
            opacity={haloOpacity}
            side={THREE.BackSide} depthWrite={false}
          />
        </mesh>
      )}

      {/* Saturn ring for project type */}
      {node.type === "project" && (
        <mesh ref={ringRef} rotation={[Math.PI * 0.42, 0.2, 0]}>
          <ringGeometry args={[size * 1.5, size * 2.1, 48]} />
          <animated.meshBasicMaterial
            color={color} transparent
            opacity={ringOpacity}
            side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>
      )}

      {/* Main sphere */}
      <animated.mesh
        ref={meshRef}
        scale={scale}
        onClick={e => { if (!canClick) return; e.stopPropagation(); onSelect(node) }}
        onPointerOver={e => { if (!canClick) return; e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default" }}
      >
        <sphereGeometry args={[size, isAbout ? 48 : isMain ? 32 : 14, isAbout ? 48 : isMain ? 32 : 14]} />
        <animated.meshPhysicalMaterial
          color={color} emissive={color} emissiveIntensity={emissiveInt}
          roughness={isRef ? 0.75 : 0.18} metalness={isRef ? 0.55 : 0.35}
          clearcoat={isRef ? 0 : 0.6} clearcoatRoughness={0.25}
          transparent opacity={opacity}
        />
      </animated.mesh>

      {/* Draft ring */}
      {isDraft && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.2, size * 1.35, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label — constrained width, no overflow */}
      {showLabel && (
        <Html distanceFactor={16} center zIndexRange={[50, 60]} style={{ pointerEvents: "none" }}>
          <div style={{
            ...glassChip(color, hovered || isSelected),
            padding: "4px 10px",
            color: "#f1f5f9",
            fontSize: "10px",
            fontFamily: "'DM Mono', monospace",
            whiteSpace: "nowrap",
            maxWidth: "220px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "0.03em",
            textAlign: "center",
            marginTop: `${(size * 16) + 18}px`,
          }}>
            {isDraft && <span style={{ color: "#64748b", marginRight: "5px" }}>draft ·</span>}
            {node.title}
          </div>
        </Html>
      )}
    </group>
  )
}

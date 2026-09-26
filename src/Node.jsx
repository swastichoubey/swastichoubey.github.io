import { useState, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { useSpring, animated } from "@react-spring/three"
import { THEME } from "./theme"
import { glassChip } from "./glass"

// Interim reference dot — replaced by moons in Phase 4. Articles render as
// <Planet>.

// fade: "none" | "hard" (filter/selection fade)
const FADE_OPACITY = { none: 1.0, hard: 0.18 }
const SIZE = 0.24

export function Node({ node, livePos, isSelected, isHighlighted, fade = "none", onSelect, onHoverChange }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  useFrame(() => { groupRef.current.position.copy(livePos) })
  const color = THEME.ref

  // Scale gets a touch of overshoot so hovers feel alive; opacity is
  // critically damped so fades never flicker.
  const { scale } = useSpring({
    scale: (hovered || isSelected) ? 1.28 : 1.0,
    config: { mass: 0.9, tension: 380, friction: 22 },
  })
  const { opacity } = useSpring({
    opacity: FADE_OPACITY[fade],
    config: { mass: 1, tension: 200, friction: 30 },
  })

  const showLabel = hovered || isSelected || isHighlighted

  return (
    <group ref={groupRef} position={livePos}>
      <animated.mesh
        scale={scale}
        onClick={e => { e.stopPropagation(); onSelect(node) }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); onHoverChange?.(node.id); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { setHovered(false); onHoverChange?.(null); document.body.style.cursor = "default" }}
      >
        <sphereGeometry args={[SIZE, 14, 14]} />
        <animated.meshPhysicalMaterial
          color={color} emissive={color}
          emissiveIntensity={(hovered || isSelected) ? THEME.emissiveHover : THEME.emissiveRef}
          roughness={0.75} metalness={0.55}
          transparent opacity={opacity}
        />
      </animated.mesh>

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
            marginTop: `${(SIZE * 16) + 18}px`,
          }}>
            {node.title}
          </div>
        </Html>
      )}
    </group>
  )
}

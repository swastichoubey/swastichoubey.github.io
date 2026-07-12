import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { THEME } from "./theme"

// fade: "none" | "soft" (about-mode dim) | "hard" (filter/selection fade)
const FADE_OPACITY = { none: 0.28, soft: 0.11, hard: 0.08 }

export function Edge({ start, end, isHighlighted, fade = "none" }) {
  const matRef = useRef()

  const points = useMemo(() => {
    const s   = new THREE.Vector3(start.x, start.y, start.z)
    const e   = new THREE.Vector3(end.x,   end.y,   end.z)
    const mid = new THREE.Vector3().lerpVectors(s, e, 0.5)
    mid.y += 1.0
    return new THREE.QuadraticBezierCurve3(s, mid, e).getPoints(48)
  }, [start, end])

  const posArray = useMemo(
    () => new Float32Array(points.flatMap(p => [p.x, p.y, p.z])),
    [points]
  )

  const targetOpacity = isHighlighted ? 0.85 : FADE_OPACITY[fade]
  const color = isHighlighted ? THEME.edgeHighlight : THEME.edgeDefault

  // Exponential damping → fades ease out instead of snapping
  useFrame((_, dt) => {
    if (!matRef.current) return
    const k = 1 - Math.exp(-dt * 7)
    matRef.current.opacity += (targetOpacity - matRef.current.opacity) * k
  })

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length} array={posArray} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial ref={matRef} color={color} transparent opacity={targetOpacity} />
    </line>
  )
}

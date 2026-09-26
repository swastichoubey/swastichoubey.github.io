import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { THEME } from "./theme"

// fade: "none" | "hard" (filter/selection fade)
const FADE_OPACITY = { none: 0.28, hard: 0.08 }
const SEGMENTS = 48

const _mid = new THREE.Vector3()
const _pt  = new THREE.Vector3()

// start/end are live Vector3s that move with orbital drift; the arc is
// rebuilt each frame (a quadratic bezier lifted slightly at the midpoint).
export function Edge({ start, end, isHighlighted, fade = "none" }) {
  const matRef = useRef()
  const posArray = useMemo(() => new Float32Array((SEGMENTS + 1) * 3), [])
  const attrRef = useRef()

  const targetOpacity = isHighlighted ? 0.85 : FADE_OPACITY[fade]
  const color = isHighlighted ? THEME.edgeHighlight : THEME.edgeDefault

  useFrame((_, dt) => {
    _mid.lerpVectors(start, end, 0.5)
    _mid.y += 1.0
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS, u = 1 - t
      _pt.set(0, 0, 0)
        .addScaledVector(start, u * u)
        .addScaledVector(_mid, 2 * u * t)
        .addScaledVector(end, t * t)
      posArray[i * 3] = _pt.x; posArray[i * 3 + 1] = _pt.y; posArray[i * 3 + 2] = _pt.z
    }
    if (attrRef.current) attrRef.current.needsUpdate = true

    // Exponential damping → fades ease out instead of snapping
    if (matRef.current) {
      const k = 1 - Math.exp(-dt * 7)
      matRef.current.opacity += (targetOpacity - matRef.current.opacity) * k
    }
  })

  return (
    <line frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={attrRef} attach="attributes-position" count={SEGMENTS + 1} array={posArray} itemSize={3} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <lineBasicMaterial ref={matRef} color={color} transparent opacity={targetOpacity} />
    </line>
  )
}

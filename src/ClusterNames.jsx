import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Billboard } from "@react-three/drei"
import * as THREE from "three"
import { HOME_DIR } from "./layout"

// ─── Cluster names ───────────────────────────────────────────────────────────
// Large, low-contrast name at each visible cluster's centre, brighter while
// that cluster is selected in the filter. Drawn once into a canvas texture
// (DM Mono, the UI font) on a camera-facing quad. It sits slightly behind the
// cluster, is depth-tested so planets pass in front of it, and never takes
// pointer events, so it stays out of the way of planet labels and hover.

const FONT = "500 96px 'DM Mono', monospace"
const TEXT_HEIGHT = 1.4          // world units for the texture's full height
const REST_OPACITY = 0.1
const HIGHLIGHT_OPACITY = 0.4
const PUSH_BACK = 1.5            // units behind the cluster, away from the camera
const noRaycast = () => null

function makeTexture(name) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  ctx.font = FONT
  ctx.letterSpacing = "0.12em"
  const width = Math.ceil(ctx.measureText(name).width) + 64
  canvas.width = width
  canvas.height = 160
  ctx.font = FONT
  ctx.letterSpacing = "0.12em"
  ctx.fillStyle = "#dbe2ee"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name, width / 2, 84)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { texture, aspect: width / canvas.height }
}

function ClusterName({ cluster, highlighted, fontReady }) {
  const gl = useThree(s => s.gl)
  const label = useMemo(() => (fontReady ? makeTexture(cluster.name) : null), [cluster.name, fontReady])
  useEffect(() => () => label?.texture.dispose(), [label])
  const matRef = useRef()

  useFrame((_, dt) => {
    if (!matRef.current) return
    const goal = highlighted ? HIGHLIGHT_OPACITY : REST_OPACITY
    matRef.current.opacity += (goal - matRef.current.opacity) * (1 - Math.exp(-dt * 6))
  })

  if (!label) return null
  label.texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy())
  const { x, y, z } = cluster.center
  const [dx, dy, dz] = HOME_DIR
  return (
    <Billboard position={[x - dx * PUSH_BACK, y - dy * PUSH_BACK, z - dz * PUSH_BACK]}>
      <mesh scale={[TEXT_HEIGHT * label.aspect, TEXT_HEIGHT, 1]} raycast={noRaycast} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial ref={matRef} map={label.texture} transparent opacity={REST_OPACITY} depthWrite={false} />
      </mesh>
    </Billboard>
  )
}

// highlighted: Set of cluster names currently selected in the filter
export function ClusterNames({ clusters, highlighted }) {
  // Wait for DM Mono (loaded by the page's Google Fonts stylesheet) before
  // drawing, or the canvas would bake in a fallback font.
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    document.fonts.load(FONT).catch(() => {}).then(() => { if (!cancelled) setFontReady(true) })
    return () => { cancelled = true }
  }, [])

  return clusters.map(c => (
    <ClusterName key={c.name} cluster={c} highlighted={!!highlighted?.has(c.name)} fontReady={fontReady} />
  ))
}

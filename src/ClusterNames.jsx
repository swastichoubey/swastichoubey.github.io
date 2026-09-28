import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Billboard } from "@react-three/drei"
import * as THREE from "three"
import {
  LABEL_FONT, LABEL_SPACING, LABEL_CANVAS_H, LABEL_HEIGHT, labelCanvasPx, labelQuadWidth,
} from "./clusterLabel"

// ─── Cluster names ───────────────────────────────────────────────────────────
// Large, low-contrast name at each visible cluster's centre, brighter while
// that cluster is selected in the filter. Drawn once into a canvas texture
// (DM Mono, the UI font) on a camera-facing quad at the cluster centre. The
// cluster's planets orbit outside it (layout.js), so none ever covers the
// text; it never takes pointer events, so it stays out of the way of planet
// labels and hover. Sizes come from clusterLabel.js, shared with the layout.

const REST_OPACITY = 0.1
const HIGHLIGHT_OPACITY = 0.4
// Fade out as the camera gets close, so a name never looms over a zoomed-in view
const NEAR_HIDE = 8, NEAR_SHOW = 16
const _pos = new THREE.Vector3()
const noRaycast = () => null

function makeTexture(name) {
  const canvas = document.createElement("canvas")
  canvas.width = labelCanvasPx(name)
  canvas.height = LABEL_CANVAS_H
  const ctx = canvas.getContext("2d")
  ctx.font = LABEL_FONT
  ctx.letterSpacing = LABEL_SPACING
  ctx.fillStyle = "#dbe2ee"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name, canvas.width / 2, LABEL_CANVAS_H / 2 + 4)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture }
}

function ClusterName({ cluster, highlighted, hidden, fontReady }) {
  const gl = useThree(s => s.gl)
  const camera = useThree(s => s.camera)
  const label = useMemo(() => (fontReady ? makeTexture(cluster.name) : null), [cluster.name, fontReady])
  useEffect(() => () => label?.texture.dispose(), [label])
  const matRef = useRef()

  useFrame((_, dt) => {
    if (!matRef.current) return
    _pos.set(cluster.center.x, cluster.center.y, cluster.center.z)
    const near = THREE.MathUtils.smoothstep(camera.position.distanceTo(_pos), NEAR_HIDE, NEAR_SHOW)
    const goal = hidden ? 0 : (highlighted ? HIGHLIGHT_OPACITY : REST_OPACITY) * near
    matRef.current.opacity += (goal - matRef.current.opacity) * (1 - Math.exp(-dt * 6))
  })

  if (!label) return null
  label.texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy())
  const { x, y, z } = cluster.center
  return (
    <Billboard position={[x, y, z]}>
      <mesh scale={[labelQuadWidth(cluster.name), LABEL_HEIGHT, 1]} raycast={noRaycast} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial ref={matRef} map={label.texture} transparent opacity={REST_OPACITY} depthWrite={false} />
      </mesh>
    </Billboard>
  )
}

// highlighted: Set of cluster names currently selected in the filter
// hidden: fade every name out (camera is flying into a planet)
export function ClusterNames({ clusters, highlighted, hidden }) {
  // Wait for DM Mono (loaded by the page's Google Fonts stylesheet) before
  // drawing, or the canvas would bake in a fallback font.
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    document.fonts.load(LABEL_FONT).catch(() => {}).then(() => { if (!cancelled) setFontReady(true) })
    return () => { cancelled = true }
  }, [])

  return clusters.map(c => (
    <ClusterName key={c.name} cluster={c} highlighted={!!highlighted?.has(c.name)} hidden={hidden} fontReady={fontReady} />
  ))
}

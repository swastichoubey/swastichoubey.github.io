import { useMemo, useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

// ─── Starfield ───────────────────────────────────────────────────────────────
// Three shells of point stars at different depths. Each layer is a single
// Points draw call; because the shells sit at different distances, camera
// movement (orbit, parallax) shifts them against each other. A small
// fraction of the nearer stars twinkle. Brightness stays under the bloom
// threshold so stars never smear.

const LAYERS = [
  { name: "far",  count: 3000, radius: 300, depth: 60, size: 1.2, brightness: 0.45, twinkle: 0 },
  { name: "mid",  count: 1000, radius: 170, depth: 40, size: 1.7, brightness: 0.6,  twinkle: 0.05 },
  { name: "near", count: 250,  radius: 100, depth: 20, size: 2.4, brightness: 0.7,  twinkle: 0.06 },
]

// Low-saturation temperature spread: cool blue-white → white → warm.
const TINTS = [new THREE.Color("#c7d7ff"), new THREE.Color("#ffffff"), new THREE.Color("#ffe6c7")]

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uBrightness;
attribute float aSize;
attribute float aBright;
attribute float aTwinkle;
attribute float aPhase;
attribute vec3 aTint;
varying vec3 vColor;
void main() {
  float tw = aTwinkle > 0.0 ? 0.55 + 0.45 * sin(uTime * aTwinkle + aPhase) : 1.0;
  vColor = aTint * aBright * tw * uBrightness;
  gl_PointSize = uSize * aSize * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d);
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

// Small seeded PRNG so the sky is the same on every visit.
function prng(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildLayer(layer, seed) {
  const r = prng(seed)
  const n = layer.count
  const position = new Float32Array(n * 3)
  const aSize    = new Float32Array(n)
  const aBright  = new Float32Array(n)
  const aTwinkle = new Float32Array(n)
  const aPhase   = new Float32Array(n)
  const aTint    = new Float32Array(n * 3)
  const c = new THREE.Color()
  for (let i = 0; i < n; i++) {
    // uniform direction on the sphere
    const u = r() * 2 - 1, phi = r() * Math.PI * 2, s = Math.sqrt(1 - u * u)
    const dist = layer.radius + r() * layer.depth
    position.set([s * Math.cos(phi) * dist, u * dist, s * Math.sin(phi) * dist], i * 3)
    aSize[i]   = 0.6 + r() * 0.7
    aBright[i] = 0.35 + Math.pow(r(), 2) * 0.65   // mostly dim, a few bright
    aTwinkle[i] = r() < layer.twinkle ? 1.2 + r() * 2.0 : 0
    aPhase[i]  = r() * Math.PI * 2
    const t = r()
    c.copy(TINTS[1]).lerp(t < 0.5 ? TINTS[0] : TINTS[2], Math.abs(t - 0.5) * 1.2)
    aTint.set([c.r, c.g, c.b], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
  geometry.setAttribute("aSize",    new THREE.BufferAttribute(aSize, 1))
  geometry.setAttribute("aBright",  new THREE.BufferAttribute(aBright, 1))
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(aTwinkle, 1))
  geometry.setAttribute("aPhase",   new THREE.BufferAttribute(aPhase, 1))
  geometry.setAttribute("aTint",    new THREE.BufferAttribute(aTint, 3))
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime:       { value: 0 },
      uPixelRatio: { value: 1 },
      uSize:       { value: layer.size },
      uBrightness: { value: layer.brightness },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return { geometry, material }
}

export function Starfield({ reducedMotion }) {
  const layers = useMemo(() => LAYERS.map((l, i) => buildLayer(l, 1013 + i * 7919)), [])
  const gl = useThree(s => s.gl)
  const time = useRef(0)

  useEffect(() => () => layers.forEach(l => { l.geometry.dispose(); l.material.dispose() }), [layers])

  useFrame((_, dt) => {
    if (!reducedMotion) time.current += dt
    const pr = gl.getPixelRatio()
    for (const l of layers) {
      l.material.uniforms.uTime.value = time.current
      l.material.uniforms.uPixelRatio.value = pr
    }
  })

  return layers.map((l, i) => (
    <points key={LAYERS[i].name} geometry={l.geometry} material={l.material} frustumCulled={false} />
  ))
}

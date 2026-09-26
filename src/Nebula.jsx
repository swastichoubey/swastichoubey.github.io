import { useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Billboard } from "@react-three/drei"
import * as THREE from "three"
import { THEME } from "./theme"

// ─── Nebula ──────────────────────────────────────────────────────────────────
// One faint, camera-facing cloud per visible cluster, tinted by the
// cluster's dominant article type but heavily desaturated so it never
// competes with the planets' type colours. Additive and far below the bloom
// threshold: atmosphere, not a light show.
//
// The domain-warped fbm is baked once per cloud into a small half-float
// texture; evaluating it per pixel every frame cost ~20fps on an Intel UHD
// 620. At draw time the texture is sampled twice with slowly
// counter-rotating coordinates, which keeps the cloud gently shifting.

const SIZE = 24
const BAKE_RESOLUTION = 512
const QUAD = new THREE.PlaneGeometry(1, 1)
const noRaycast = () => null

const BAKE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const BAKE_FRAGMENT = /* glsl */ `
uniform float uSeed;
varying vec2 vUv;

// sin-free hash (Dave Hoskins) — sin() loses precision at large inputs on
// some GPUs and shows up as blocky artifacts
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.02 + 17.0; a *= 0.5; }
  return s / 0.96875;
}

void main() {
  vec2 p = (vUv - 0.5) * 3.2 + uSeed * 13.0;
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  float n = fbm(p + 1.7 * q);
  gl_FragColor = vec4(smoothstep(0.45, 0.95, n), 0.0, 0.0, 1.0);
}
`

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D uDensity;
uniform vec3 uTint;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;

vec2 rotate(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float falloff = smoothstep(1.0, 0.15, r);
  float d1 = texture2D(uDensity, rotate(c, uTime * 0.004) + 0.5).r;
  float d2 = texture2D(uDensity, rotate(c * 0.93, 1.7 - uTime * 0.003) + 0.5).r;
  float density = mix(d1, d2, 0.35) * falloff * falloff;
  gl_FragColor = vec4(uTint * density * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

// Renders the fbm density for one cloud into a texture, once.
function bakeDensity(gl, seed) {
  const target = new THREE.WebGLRenderTarget(BAKE_RESOLUTION, BAKE_RESOLUTION, {
    type: THREE.HalfFloatType, depthBuffer: false,
  })
  const material = new THREE.ShaderMaterial({
    vertexShader: BAKE_VERTEX,
    fragmentShader: BAKE_FRAGMENT,
    uniforms: { uSeed: { value: seed } },
  })
  const geometry = new THREE.PlaneGeometry(2, 2)
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(geometry, material))
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(target)
  gl.render(scene, new THREE.Camera())
  gl.setRenderTarget(previous)
  geometry.dispose()
  material.dispose()
  return target
}

// Low-saturation, dim version of a type colour.
function nebulaTint(type) {
  const hsl = {}
  new THREE.Color(THEME[type]).getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, hsl.s * 0.35, hsl.l * 0.55).multiplyScalar(0.07)
}

function NebulaCloud({ cluster, faded, reducedMotion, index }) {
  const gl = useThree(s => s.gl)
  const density = useMemo(() => bakeDensity(gl, index * 0.37 + 0.11), [gl, index])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uDensity: { value: density.texture },
      uTint:    { value: nebulaTint(cluster.dominantType) },
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [density, cluster.dominantType])
  useEffect(() => () => { material.dispose(); density.dispose() }, [material, density])

  useFrame((_, dt) => {
    const u = material.uniforms
    if (!reducedMotion) u.uTime.value += dt
    u.uOpacity.value += ((faded ? 0.25 : 1) - u.uOpacity.value) * (1 - Math.exp(-dt * 4))
  })

  const { x, y, z } = cluster.center
  return (
    <Billboard position={[x, y, z]}>
      <mesh geometry={QUAD} material={material} scale={SIZE} renderOrder={-1} raycast={noRaycast} />
    </Billboard>
  )
}

export function Nebulae({ clusters, filteredIds, reducedMotion }) {
  return clusters.map((cluster, i) => (
    <NebulaCloud
      key={cluster.name}
      cluster={cluster}
      index={i}
      reducedMotion={reducedMotion}
      // Dim a cluster's cloud when a filter leaves none of its articles
      faded={filteredIds !== null && !cluster.members.some(id => filteredIds.has(id))}
    />
  ))
}

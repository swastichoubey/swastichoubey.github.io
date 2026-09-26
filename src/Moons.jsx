import { useMemo, useRef, useState, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import { GRAPH } from "./graph.generated"
import { planetRadius } from "./encoding"
import { KEY_LIGHT_DIR } from "./planetMaterials"

// ─── Reference moons ─────────────────────────────────────────────────────────
// Every citation of a visible article is a small moon orbiting that article's
// planet. Moons are hidden at rest and fade + scale in (~300ms) while their
// planet is active (hovered, focused or selected). All moons share one
// instanced draw call; a second, invisible and larger instanced mesh takes
// the pointer events so a moon a few pixels wide is still easy to hit.
// Hover shows title/authors/year; click opens the source in a new tab.

const MOON_RADIUS = 0.17
const HIT_RADIUS  = 0.4
const MIN_MOON_PX = 7      // radius: moons never render smaller than ~14px across
const ORBIT_SPEED = 0.12   // rad/s
const SPHERE = new THREE.SphereGeometry(1, 20, 14)

const REFERENCES = new Map(GRAPH.references.map(r => [r.id, r]))

function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}

// One entry per citation of a visible article, with its orbit around the planet.
function buildMoons(visibleIds, articlesById) {
  const moons = []
  for (const id of visibleIds) {
    const refs = GRAPH.citations.filter(c => c.article === id).map(c => REFERENCES.get(c.reference))
    const R = planetRadius(articlesById.get(id).readTime)
    const tilt = (seeded(id + ":moons") - 0.5) * 0.7
    refs.forEach((ref, k) => {
      moons.push({
        key: `${id}:${ref.id}`,
        article: id,
        ref,
        radius: R * 1.6 + 0.35 + (k % 2) * 0.35,
        phase: (k / refs.length) * Math.PI * 2,
        inclination: tilt + (seeded(ref.id) - 0.5) * 0.2,
      })
    })
  }
  return moons
}

const VERTEX = /* glsl */ `
attribute float aAlpha;
attribute float aHover;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vAlpha;
varying float vHover;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(m) * normal);
  vAlpha = aAlpha;
  vHover = aHover;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLightDir;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vAlpha;
varying float vHover;
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float diffuse = clamp((dot(N, uLightDir) + 0.1) / 1.1, 0.0, 1.0);
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
  vec3 col = uColor * (0.12 + 0.8 * diffuse) + vec3(0.75, 0.82, 0.95) * rim * (0.35 + 0.9 * vHover);
  gl_FragColor = vec4(col, vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _p = new THREE.Vector3()

// Position of a moon relative to its planet at orbit time t.
function moonOffset(moon, t, out) {
  const a = moon.phase + t
  const x = Math.cos(a) * moon.radius, z = Math.sin(a) * moon.radius
  return out.set(x, -z * Math.sin(moon.inclination), z * Math.cos(moon.inclination))
}

// isActive(articleId) → should this planet's moons show right now
// onHoverChange(moon | null) → a moon gained / lost the pointer
export function Moons({ live, articles, isActive, focusedRef, onHoverChange, reducedMotion }) {
  const articlesById = useMemo(() => new Map(articles.map(a => [a.id, a])), [articles])
  const moons = useMemo(() => buildMoons(articles.map(a => a.id), articlesById), [articles, articlesById])
  const n = moons.length

  const camera = useThree(s => s.camera)
  const viewHeight = useThree(s => s.size.height)
  const visualRef = useRef()
  const hitRef = useRef()
  const labelRef = useRef()
  const orbitT = useRef(0)
  const visibility = useRef(new Map())   // article id → eased 0..1
  const [hovered, setHovered] = useState(null)   // moon index under the pointer

  const { geometry, material, alphaAttr, hoverAttr } = useMemo(() => {
    const alphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1)
    const hoverAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1)
    alphaAttr.setUsage(THREE.DynamicDrawUsage)
    hoverAttr.setUsage(THREE.DynamicDrawUsage)
    const geometry = SPHERE.clone()
    geometry.setAttribute("aAlpha", alphaAttr)
    geometry.setAttribute("aHover", hoverAttr)
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uColor:    { value: new THREE.Color("#aab4c3") },
        uLightDir: { value: KEY_LIGHT_DIR },
      },
      transparent: true,
    })
    return { geometry, material, alphaAttr, hoverAttr }
  }, [n])
  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose(); hitMaterial.dispose() }, [geometry, material, hitMaterial])

  // Keyboard: a focused reference link highlights its moon and shows its label
  const focusedIndex = focusedRef ? moons.findIndex(m => m.key === focusedRef) : -1
  const labelIndex = hovered ?? (focusedIndex >= 0 ? focusedIndex : null)
  const labelMoon = labelIndex != null ? moons[labelIndex] : null

  useFrame((_, dt) => {
    if (!visualRef.current || !hitRef.current) return
    // world units per screen pixel at unit distance
    const unitsPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / viewHeight
    // Moons hold still while one is under the pointer
    if (!reducedMotion && hovered == null) orbitT.current += dt * ORBIT_SPEED
    const k = 1 - Math.exp(-dt * 10)   // ~300ms to settle
    const vis = visibility.current
    for (const a of articles) {
      const v = vis.get(a.id) ?? 0
      vis.set(a.id, v + ((isActive(a.id) ? 1 : 0) - v) * k)
    }

    moons.forEach((moon, i) => {
      const v = vis.get(moon.article)
      moonOffset(moon, orbitT.current, _p).add(live.get(moon.article))
      const shown = v > 0.01
      // Zoomed out, grow moons so they stay at least MIN_MOON_PX in radius
      const minR = MIN_MOON_PX * unitsPerPx * _p.distanceTo(camera.position)
      const r = Math.max(MOON_RADIUS, minR)
      _s.setScalar(shown ? r * (0.4 + 0.6 * v) * (i === labelIndex ? 1.35 : 1) : 0)
      _m.compose(_p, _q, _s)
      visualRef.current.setMatrixAt(i, _m)
      // Hidden moons get a zero-size hit sphere, so they can't be hovered
      _s.setScalar(shown && v > 0.5 ? Math.max(HIT_RADIUS, r * 1.8) : 0)
      _m.compose(_p, _q, _s)
      hitRef.current.setMatrixAt(i, _m)
      alphaAttr.array[i] = v
      hoverAttr.array[i] = i === labelIndex ? 1 : 0
      if (i === labelIndex && labelRef.current) labelRef.current.position.copy(_p)
    })
    visualRef.current.instanceMatrix.needsUpdate = true
    hitRef.current.instanceMatrix.needsUpdate = true
    hitRef.current.computeBoundingSphere()
    alphaAttr.needsUpdate = true
    hoverAttr.needsUpdate = true
  })

  const setHover = i => {
    if (i === hovered) return
    setHovered(i)
    onHoverChange(i == null ? null : moons[i])
    document.body.style.cursor = i == null ? "default" : "pointer"
  }

  if (n === 0) return null
  return (
    <>
      {/* renderOrder: drawn after coronas (which don't write depth), so a
          star's glow never washes over its moons */}
      <instancedMesh ref={visualRef} args={[geometry, material, n]} frustumCulled={false} raycast={() => null} renderOrder={10} />
      <instancedMesh
        ref={hitRef}
        args={[SPHERE, hitMaterial, n]}
        frustumCulled={false}
        onPointerMove={e => { e.stopPropagation(); setHover(e.instanceId) }}
        onPointerOut={() => setHover(null)}
        onClick={e => {
          e.stopPropagation()
          const url = moons[e.instanceId]?.ref.url
          if (url) window.open(url, "_blank", "noopener,noreferrer")
        }}
      />

      <group ref={labelRef}>
        {labelMoon && (
          <Html center zIndexRange={[60, 70]} style={{ pointerEvents: "none" }}>
            <div style={{
              transform: "translateY(-34px)",
              maxWidth: "260px", width: "max-content",
              padding: "6px 10px",
              background: "rgba(9, 11, 26, 0.92)",
              border: "1px solid rgba(170,180,195,0.35)",
              borderRadius: "8px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px", lineHeight: 1.45,
              color: "#f1f5f9",
            }}>
              <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {labelMoon.ref.title}
              </div>
              {(labelMoon.ref.authors || labelMoon.ref.year) && (
                <div style={{ color: "#aab4c3", marginTop: "2px" }}>
                  {[labelMoon.ref.authors, labelMoon.ref.year].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </>
  )
}

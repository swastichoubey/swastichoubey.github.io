import { useMemo, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { GRAPH } from "./graph.generated"
import { THEME } from "./theme"

// ─── Related-article arcs ────────────────────────────────────────────────────
// Hand-declared `related` links (frontmatter) drawn as a thin dashed arc
// between the two planets, blending their type colours, with the dashes
// flowing slowly. Hidden at rest; fades in (~300ms) while either article is
// active. Deliberately line-based so it never reads as a reference moon.

const SEGMENTS = 64

const VERTEX = /* glsl */ `
attribute float aT;
varying float vT;
void main() {
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
uniform float uTime;
uniform float uDashes;
varying float vT;
void main() {
  float dash = step(0.45, fract(vT * uDashes - uTime * 0.25));
  // fade the ends so the arc emerges from the planets rather than touching them
  float ends = smoothstep(0.0, 0.08, vT) * smoothstep(1.0, 0.92, vT);
  vec3 col = mix(uColorA, uColorB, vT) * 0.55;
  gl_FragColor = vec4(col, dash * ends * uAlpha * 0.8);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _mid = new THREE.Vector3(), _pt = new THREE.Vector3()

function Arc({ from, to, live, isActive, reducedMotion }) {
  const { line, material, positions } = useMemo(() => {
    const positions = new Float32Array((SEGMENTS + 1) * 3)
    const t = new Float32Array(SEGMENTS + 1).map((_, i) => i / SEGMENTS)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute("aT", new THREE.BufferAttribute(t, 1))
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uColorA: { value: new THREE.Color(THEME[from.type]) },
        uColorB: { value: new THREE.Color(THEME[to.type]) },
        uAlpha:  { value: 0 },
        uTime:   { value: 0 },
        uDashes: { value: 24 },
      },
      transparent: true,
      depthWrite: false,
    })
    const line = new THREE.Line(geometry, material)
    line.frustumCulled = false
    line.raycast = () => null
    return { line, material, positions }
  }, [from, to])
  useEffect(() => () => { line.geometry.dispose(); material.dispose() }, [line, material])

  const alpha = useRef(0)
  useFrame((_, dt) => {
    const goal = isActive(from.id) || isActive(to.id) ? 1 : 0
    alpha.current += (goal - alpha.current) * (1 - Math.exp(-dt * 10))
    material.uniforms.uAlpha.value = alpha.current
    line.visible = alpha.current > 0.005
    if (!line.visible) return
    if (!reducedMotion) material.uniforms.uTime.value += dt

    _a.copy(live.get(from.id)); _b.copy(live.get(to.id))
    const dist = _a.distanceTo(_b)
    _mid.lerpVectors(_a, _b, 0.5)
    _mid.y += dist * 0.35
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS, u = 1 - t
      _pt.set(0, 0, 0).addScaledVector(_a, u * u).addScaledVector(_mid, 2 * u * t).addScaledVector(_b, t * t)
      positions[i * 3] = _pt.x; positions[i * 3 + 1] = _pt.y; positions[i * 3 + 2] = _pt.z
    }
    line.geometry.attributes.position.needsUpdate = true
    material.uniforms.uDashes.value = Math.max(8, Math.round(dist * 2.5))
  })

  return <primitive object={line} />
}

export function RelatedArcs({ live, articles, isActive, reducedMotion }) {
  const byId = useMemo(() => new Map(articles.map(a => [a.id, a])), [articles])
  // Only pairs where both articles are visible
  const pairs = GRAPH.related.filter(([a, b]) => byId.has(a) && byId.has(b))
  return pairs.map(([a, b]) => (
    <Arc key={`${a}|${b}`} from={byId.get(a)} to={byId.get(b)} live={live} isActive={isActive} reducedMotion={reducedMotion} />
  ))
}

// ─── Planet shaders ──────────────────────────────────────────────────────────
// One ShaderMaterial per planet, built from a shared lighting model plus a
// per-type surface:
//   exploratory → gas giant with slow, differentially rotating bands
//   experimental → cratered, mottled rock
//   opinion      → small emissive star (the only self-luminous type) + corona
//   project      → rocky planet with a tilted ring
// Planets are unit spheres scaled to their radius, so noise frequencies are
// independent of size. Output is linear HDR: only star surfaces, coronas and
// the rims of recent planets exceed the bloom threshold.
import * as THREE from "three"

// World-space direction *towards* the single key light.
export const KEY_LIGHT_DIR = new THREE.Vector3(1.0, 0.4, 0.1).normalize()

const NOISE = /* glsl */ `
// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// 4-octave fbm, roughly in [-1, 1]
float fbm(vec3 p) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) { sum += amp * snoise(p); p *= 2.03; amp *= 0.5; }
  return sum / 0.9375;
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

// Worley-based craters: adds to height h and its object-space gradient.
// Only some cells hold a crater, with varied radii, so the field doesn't
// read as a grid.
void crater(vec3 p, float freq, float seed, float amp, inout float h, inout vec3 grad) {
  vec3 x = p * freq;
  vec3 cell = floor(x), f = fract(x);
  float best = 8.0; vec3 bestVec = vec3(0.0), bestCell = vec3(0.0);
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec3 o = vec3(float(i), float(j), float(k));
    vec3 r = o + hash33(cell + o + seed) - f;
    float d = dot(r, r);
    if (d < best) { best = d; bestVec = r; bestCell = cell + o; }
  }
  vec3 cellHash = hash33(bestCell + seed + 17.0);
  if (cellHash.x > 0.55) return;
  float R = mix(0.18, 0.42, cellHash.y);
  float d = sqrt(best);
  float u = d / R;
  float prof = 0.0, dprof = 0.0;
  if (u < 1.0) { prof = u * u - 1.0; dprof = 2.0 * u; }          // bowl
  float rim = exp(-pow((u - 1.0) / 0.22, 2.0));                  // raised rim
  prof += 0.45 * rim;
  dprof += 0.45 * rim * (-2.0 * (u - 1.0) / (0.22 * 0.22));
  vec3 dir = d > 1e-4 ? -bestVec / d : vec3(0.0);
  h += amp * prof;
  grad += amp * dprof / R * freq * dir;
}
`

const VERTEX = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform float uGlow;
uniform float uOpacity;
uniform float uTime;
uniform float uHover;
uniform float uSeed;
uniform mat4 modelMatrix;
varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
${NOISE}

// Key light + low ambient gives every planet a lit and a shadowed side.
// The Fresnel rim is the atmosphere: strongest on the lit limb, still faintly
// there on the night side, scaled by recency glow (and a touch on hover).
vec3 lightPlanet(vec3 albedo, vec3 Ngeo, vec3 Nsurf, vec3 V) {
  float ndl = dot(Nsurf, uLightDir);
  float diffuse = clamp((ndl + 0.08) / 1.08, 0.0, 1.0);
  vec3 col = albedo * (0.045 + 0.9 * diffuse);
  float fres = pow(1.0 - clamp(dot(Ngeo, V), 0.0, 1.0), 3.0);
  float litSide = smoothstep(-0.35, 0.45, dot(Ngeo, uLightDir));
  vec3 atmo = mix(uColor, vec3(1.0), 0.2);
  col += atmo * fres * (0.2 + 0.8 * litSide) * (0.5 + 2.6 * uGlow) * (1.0 + 0.6 * uHover);
  return col;
}

vec3 toWorld(vec3 objDir) { return normalize(mat3(modelMatrix) * objDir); }
`

const FRAGMENT_TAIL = /* glsl */ `
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const SURFACES = {
  exploratory: /* glsl */ `
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 p = normalize(vObjPos);
  // Differential rotation: each latitude band drifts at its own speed.
  float lat = p.y;
  float flow = uTime * 0.035 * (0.6 + 0.4 * sin(lat * 9.0 + uSeed * 6.283));
  float c = cos(flow), s = sin(flow);
  vec3 q = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
  float warp = fbm(q * vec3(2.2, 5.0, 2.2) + uSeed * 10.0);
  float bands = 0.5 + 0.5 * sin(lat * 15.0 + warp * 3.0 + uSeed * 20.0);
  float fine = fbm(q * vec3(4.0, 22.0, 4.0) + 3.0) * 0.5 + 0.5;
  float t = clamp(bands * 0.65 + fine * 0.35, 0.0, 1.0);
  vec3 deep = uColor * vec3(0.35, 0.3, 0.45);
  vec3 pale = mix(uColor, vec3(0.95, 0.9, 1.0), 0.35);
  vec3 col = lightPlanet(mix(deep, pale, t) * 0.85, N, N, V);
${FRAGMENT_TAIL}`,

  experimental: /* glsl */ `
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 p = normalize(vObjPos);
  float mottle = fbm(p * 3.0 + uSeed * 7.0) * 0.5 + 0.5;
  float detail = fbm(p * 12.0 + uSeed * 3.0) * 0.5 + 0.5;
  float h = 0.0; vec3 grad = vec3(0.0);
  crater(p, 3.0, uSeed * 13.0, 0.45, h, grad);
  crater(p, 7.0, uSeed * 13.0 + 1.7, 0.22, h, grad);
  vec3 bumped = toWorld(normalize(p - 0.06 * (grad - dot(grad, p) * p)));
  vec3 albedo = uColor * mix(0.3, 0.72, mottle) * mix(0.85, 1.1, detail) * (1.0 + 0.5 * h);
  vec3 col = lightPlanet(albedo, N, bumped, V);
${FRAGMENT_TAIL}`,

  project: /* glsl */ `
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 p = normalize(vObjPos);
  float ridge = 1.0 - abs(fbm(p * 4.0 + uSeed * 9.0));
  ridge *= ridge;
  float m = fbm(p * 2.0 + uSeed * 5.0) * 0.5 + 0.5;
  float h = 0.0; vec3 grad = vec3(0.0);
  crater(p, 5.0, uSeed * 11.0, 0.18, h, grad);
  vec3 bumped = toWorld(normalize(p - 0.06 * (grad - dot(grad, p) * p)));
  vec3 lowland = uColor * vec3(0.32, 0.2, 0.18);
  vec3 highland = uColor * vec3(0.95, 0.72, 0.62);
  vec3 albedo = mix(lowland, highland, m) * mix(0.75, 1.1, ridge) * (1.0 + 0.4 * h);
  vec3 col = lightPlanet(albedo, N, bumped, V);
${FRAGMENT_TAIL}`,

  opinion: /* glsl */ `
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 p = normalize(vObjPos);
  float gran = fbm(p * 9.0 + vec3(0.0, uTime * 0.06, uTime * 0.04)) * 0.5 + 0.5;
  float spots = fbm(p * 2.5 + uTime * 0.02) * 0.5 + 0.5;
  float limb = 0.55 + 0.45 * pow(clamp(dot(N, V), 0.0, 1.0), 0.6);
  // Just bright enough at the centre to catch a little bloom: reads as a
  // light source without becoming the scene's focal point.
  vec3 hot = mix(uColor, vec3(1.0, 0.93, 0.78), 0.35);
  vec3 col = mix(uColor * 0.75, hot, gran) * limb * mix(0.82, 1.0, spots)
           * (1.0 + 0.3 * uGlow) * (1.0 + 0.2 * uHover);
${FRAGMENT_TAIL}`,
}

export function createPlanetMaterial(type, { color, glow, seed }) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT_HEAD + (SURFACES[type] ?? SURFACES.experimental),
    uniforms: {
      uColor:    { value: new THREE.Color(color) },
      uLightDir: { value: KEY_LIGHT_DIR },
      uGlow:     { value: glow },
      uOpacity:  { value: 1 },
      uTime:     { value: seed * 100 },
      uHover:    { value: 0 },
      uSeed:     { value: seed },
    },
    transparent: true,
  })
}

// Ring: banded, lit by the key light, and shadowed where the planet blocks
// the light (ray–sphere test against the planet's world-space bounds).
const RING_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform float uOpacity;
uniform float uSeed;
uniform float uInner;
uniform float uOuter;
uniform mat4 modelMatrix;
varying vec3 vObjPos;
varying vec3 vWorldPos;
${NOISE}
void main() {
  float t = (length(vObjPos.xy) - uInner) / (uOuter - uInner);
  float bands = 0.5 + 0.5 * snoise(vec3(t * 18.0, uSeed * 7.0, 0.0));
  bands = mix(bands, 0.5 + 0.5 * snoise(vec3(t * 55.0, uSeed * 3.0, 1.0)), 0.35);
  float edges = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.9, t);
  float gap = 1.0 - 0.8 * smoothstep(0.56, 0.59, t) * smoothstep(0.66, 0.63, t);
  float alpha = mix(0.2, 0.8, bands) * edges * gap;

  vec3 ringNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  float light = 0.25 + 0.75 * abs(dot(ringNormal, uLightDir));
  vec3 oc = vWorldPos - uPlanetCenter;
  float b = dot(oc, uLightDir);
  float c = dot(oc, oc) - uPlanetRadius * uPlanetRadius;
  if (b < 0.0 && b * b - c > 0.0) light *= 0.12;

  vec3 col = mix(uColor, vec3(0.92, 0.85, 0.8), 0.35) * 0.55 * light;
  gl_FragColor = vec4(col, alpha * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export const RING_INNER = 1.45, RING_OUTER = 2.35

export function createRingMaterial({ color, seed }) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: RING_FRAGMENT,
    uniforms: {
      uColor:        { value: new THREE.Color(color) },
      uLightDir:     { value: KEY_LIGHT_DIR },
      uPlanetCenter: { value: new THREE.Vector3() },
      uPlanetRadius: { value: 1 },
      uOpacity:      { value: 1 },
      uSeed:         { value: seed },
      uInner:        { value: RING_INNER },
      uOuter:        { value: RING_OUTER },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

// Soft corona for stars: camera-facing quad, additive, slowly shimmering.
const CORONA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CORONA_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
// The quad spans 3.2 star radii, so the limb sits at d = 1 / 1.6.
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  float d = length(c);
  const float LIMB = 0.625;
  float thin = exp(-max(d - LIMB, 0.0) / 0.045);             // tight rim of light at the edge
  float wide = pow(clamp(1.0 - d, 0.0, 1.0), 3.0) * 0.18;     // very faint halo
  float ang = atan(c.y, c.x);
  float rays = 0.88 + 0.12 * sin(ang * 7.0 + uTime * 0.3) * sin(ang * 3.0 - uTime * 0.2);
  vec3 col = uColor * (thin * 0.6 + wide) * rays * (0.6 + 0.5 * uGlow) * uOpacity;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createCoronaMaterial({ color, glow }) {
  return new THREE.ShaderMaterial({
    vertexShader: CORONA_VERTEX,
    fragmentShader: CORONA_FRAGMENT,
    uniforms: {
      uColor:   { value: new THREE.Color(color) },
      uGlow:    { value: glow },
      uOpacity: { value: 1 },
      uTime:    { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

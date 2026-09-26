import { blogData, isVisible, visibleClusters } from "./data"
import { planetRadius } from "./encoding"

// ─── Layout ──────────────────────────────────────────────────────────────────
// Deterministic: every value comes from a PRNG seeded by an id, so the
// universe looks the same on every visit.
//
// Clusters (only those with a published article) sit on an ellipse laid out
// in the default view's screen plane (right / up as seen along HOME_DIR),
// with only a little depth jitter for parallax, so clusters can't overlap on
// screen from the default view: Alignment right, Evals bottom (front),
// Security left, Curiosities top (back). Each article orbits its cluster
// centre on a circle whose plane also faces the default camera, tilted by at
// most ~7°, so planets within a cluster can't overlap on screen either. Orbit
// radii step outwards by both planets' radii plus a gap: two concentric
// orbits are never closer than their radius difference, so members can't
// collide in 3D either. Reference moons orbit their planet (Moons.jsx).

// Direction from the scene's centre towards the default camera (~28° above
// the ground plane). Scene.jsx frames the home view along it.
export const HOME_DIR = normalize([4, 15, 28])

const CLUSTER_RX    = 12.5   // cluster ellipse radius, screen-right
const CLUSTER_RY    = 7.5    // … and screen-up
const CLUSTER_DEPTH = 1.5    // max depth jitter towards / away from the camera
const ORBIT_TILT   = 0.12   // max tilt of an orbit plane away from facing the camera (rad)
const ORBIT_CORE   = 1.2    // clear space between cluster centre and the first planet
const ORBIT_GAP    = 0.4    // minimum surface-to-surface gap between orbits
// Angular speed at radius ORBIT_REF (rad/s); outer orbits are slower
// (Kepler-ish, ∝ r^-1.5), so a full lap takes minutes.
const ORBIT_SPEED  = 0.035
const ORBIT_REF    = 2.3

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// mulberry32
function rng(seed) {
  let a = hashString(seed)
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const range = (r, lo, hi) => lo + (hi - lo) * r()

function normalize([x, y, z]) {
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
}
const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]

// Orthonormal basis (u, w) of a plane facing `normal`; u stays horizontal.
function planeBasis(normal) {
  const u = normalize(cross([0, 1, 0], normal))
  const w = cross(normal, u)
  return { u, w }
}

// Screen axes of the default view (camera looking along -HOME_DIR)
const SCREEN = (() => {
  const { u, w } = planeBasis(HOME_DIR)
  return { right: u, up: w }
})()

// Most common article type in a cluster; ties go to the most recent article.
function dominantType(members) {
  const counts = {}
  for (const m of members) counts[m.type] = (counts[m.type] ?? 0) + 1
  const best = Math.max(...Object.values(counts))
  return [...members]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find(m => counts[m.type] === best).type
}

export function computeLayout() {
  const articles = blogData.nodes.filter(n => n.type !== "ref" && isVisible(n))

  const clusters = visibleClusters.map((name, i) => {
    const r = rng(`cluster:${name}`)
    // right / bottom / left / top, in visibleClusters order
    const angle = (i / visibleClusters.length) * Math.PI * 2 + 0.2
    const members = articles
      .filter(a => a.cluster === name)
      .sort((a, b) => a.date.localeCompare(b.date))
    const sx = Math.cos(angle) * CLUSTER_RX, sy = -Math.sin(angle) * CLUSTER_RY
    const depth = range(r, -CLUSTER_DEPTH, CLUSTER_DEPTH)
    return {
      name,
      center: {
        x: sx * SCREEN.right[0] + sy * SCREEN.up[0] + depth * HOME_DIR[0],
        y: sx * SCREEN.right[1] + sy * SCREEN.up[1] + depth * HOME_DIR[1],
        z: sx * SCREEN.right[2] + sy * SCREEN.up[2] + depth * HOME_DIR[2],
      },
      members: members.map(m => m.id),
      dominantType: dominantType(members),
    }
  })

  const byId = new Map(articles.map(a => [a.id, a]))
  const orbits = {}
  for (const cluster of clusters) {
    let radius = 0, prevR = 0
    cluster.members.forEach((id, k) => {
      const r = rng(`orbit:${id}`)
      const R = planetRadius(byId.get(id).readTime)
      radius = k === 0 ? ORBIT_CORE + R : radius + prevR + R + ORBIT_GAP
      prevR = R
      // Plane facing the camera, nudged by a small random tilt
      const { u, w } = planeBasis(HOME_DIR)
      const tu = range(r, -ORBIT_TILT, ORBIT_TILT), tw = range(r, -ORBIT_TILT, ORBIT_TILT)
      const normal = normalize(HOME_DIR.map((n, i) => n + u[i] * tu + w[i] * tw))
      orbits[id] = {
        center: cluster.center,
        radius,
        ...planeBasis(normal),
        phase: range(r, 0, Math.PI * 2),
        speed: ORBIT_SPEED * Math.pow(ORBIT_REF / radius, 1.5),
      }
    })
    // How far the cluster reaches from its centre (outer orbit + planet)
    cluster.extent = radius + prevR
  }

  return { clusters, orbits }
}

// Position on an orbit at drift time t, written into `out` (a Vector3).
export function orbitPosition(orbit, t, out) {
  const a = orbit.phase + t * orbit.speed
  const c = Math.cos(a) * orbit.radius, s = Math.sin(a) * orbit.radius
  const { center, u, w } = orbit
  return out.set(
    center.x + c * u[0] + s * w[0],
    center.y + c * u[1] + s * w[1],
    center.z + c * u[2] + s * w[2],
  )
}

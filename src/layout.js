import { blogData, isVisible, visibleClusters } from "./data"
import { planetRadius } from "./encoding"

// ─── Layout ──────────────────────────────────────────────────────────────────
// Deterministic: every value comes from a PRNG seeded by an id, so the
// universe looks the same on every visit.
//
// Clusters (only those with a published article) sit on a tilted ellipse.
// Each article orbits its cluster centre on its own inclined circle. Orbit
// radii step outwards by both planets' radii plus a gap: two concentric
// orbits are never closer than their radius difference, so members can't
// collide whatever their phase or inclination. Reference moons orbit their
// planet (Moons.jsx).

const CLUSTER_RING_RADIUS = 13
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
    // Offset so clusters sit right / front / left / back: a diamond on screen
    const angle = (i / visibleClusters.length) * Math.PI * 2 + 0.2
    const members = articles
      .filter(a => a.cluster === name)
      .sort((a, b) => a.date.localeCompare(b.date))
    return {
      name,
      center: {
        x: Math.cos(angle) * CLUSTER_RING_RADIUS,
        y: range(r, -1.5, 1.5),
        z: Math.sin(angle) * CLUSTER_RING_RADIUS * 0.75,
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
      orbits[id] = {
        center: cluster.center,
        radius,
        inclination: range(r, -0.3, 0.3),
        yaw: range(r, 0, Math.PI * 2),
        phase: range(r, 0, Math.PI * 2),
        speed: ORBIT_SPEED * Math.pow(ORBIT_REF / radius, 1.5),
      }
    })
  }

  return { clusters, orbits }
}

// Position on an orbit at drift time t, written into `out` (a Vector3).
export function orbitPosition(orbit, t, out) {
  const a = orbit.phase + t * orbit.speed
  const x = Math.cos(a) * orbit.radius
  const z = Math.sin(a) * orbit.radius
  // tilt about X, then turn about Y
  const y1 = -z * Math.sin(orbit.inclination)
  const z1 =  z * Math.cos(orbit.inclination)
  const cy = Math.cos(orbit.yaw), sy = Math.sin(orbit.yaw)
  return out.set(
    orbit.center.x + x * cy + z1 * sy,
    orbit.center.y + y1,
    orbit.center.z - x * sy + z1 * cy,
  )
}

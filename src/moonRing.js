import { GRAPH } from "./graph.generated"

// ─── Moon ring geometry ──────────────────────────────────────────────────────
// Shared by Moons (which places the moons) and Planet (which hangs its label
// below the ring). The ring faces the camera, so on screen it is a circle
// around the planet. Its radius grows with the number of moons and with how
// large moons are on screen, so that neither the moons nor their hit areas
// ever overlap each other or the planet's disc (at its hovered size).

export const MOON_RADIUS      = 0.17   // world radius, close up
export const MIN_MOON_PX      = 7      // radius: moons never render smaller than ~14px across
export const MOON_HOVER_SCALE = 1.35
const HIT_SCALE          = 1.8         // hit area radius, relative to the moon's…
const HIT_MIN            = 0.4         // …but never under this (world)
const PLANET_HOVER_SCALE = 1.12        // Planet grows this much while active
const GAP_PX             = 4           // clear screen space between hit areas

export const MOON_COUNT = GRAPH.citations.reduce(
  (m, c) => m.set(c.article, (m.get(c.article) ?? 0) + 1), new Map())

// R: planet radius; n: moons on the ring; pxWorld: world units per screen
// pixel at the planet's distance. Returns world-space radii of the ring, a
// moon and a moon's hit area.
export function moonRing(R, n, pxWorld) {
  const moon = Math.max(MOON_RADIUS, MIN_MOON_PX * pxWorld)
  const hit = Math.max(HIT_MIN, moon * HIT_SCALE)
  const gap = GAP_PX * pxWorld
  const clearOfDisc = R * PLANET_HOVER_SCALE + hit + gap
  // neighbours 2π/n apart on the circle: chord 2ρ·sin(π/n) must fit two hit areas
  const clearOfEachOther = n > 1 ? (hit + gap / 2) / Math.sin(Math.PI / n) : 0
  return { radius: Math.max(R * 1.6 + 0.35, clearOfDisc, clearOfEachOther), moon, hit }
}

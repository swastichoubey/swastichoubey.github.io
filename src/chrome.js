// Shared layout constants for the top-right chrome cluster — the "?"
// how-to-navigate button, the grid-view toggle, and the Highlights panel.
// These used to be positioned independently (each with its own hardcoded
// top/right) and only lined up by coincidence. Everything in that cluster
// should key off these instead of a fresh magic number.
export const TOPBAR_TOP = 24
export const TOPBAR_RIGHT = 24
export const TOPBAR_GAP = 10
export const TOPBAR_SIZE = 38
export const TOPBAR_RADIUS = 10

// The Highlights panel is 18% of the viewport wide, kept between 232 and
// 272px, and starts collapsed to its edge tab on viewports narrower than
// PANEL_COLLAPSE_BELOW, where it would take too much room from the scene.
const HIGHLIGHTS_MIN_W = 232
const HIGHLIGHTS_MAX_W = 272
export const highlightsWidth = viewportW =>
  Math.round(Math.min(HIGHLIGHTS_MAX_W, Math.max(HIGHLIGHTS_MIN_W, viewportW * 0.18)))
export const PANEL_COLLAPSE_BELOW = 1200

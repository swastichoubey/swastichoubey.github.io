// ─── Cluster label geometry ──────────────────────────────────────────────────
// Shared by the layout (planets orbit outside the label) and ClusterNames
// (which draws it), so both agree on the label's size without waiting for the
// font. DM Mono is monospaced: every glyph advances 0.6em, plus 0.12em of
// letter spacing.

const LABEL_FONT_PX          = 96
export const LABEL_FONT      = `500 ${LABEL_FONT_PX}px 'DM Mono', monospace`
export const LABEL_SPACING   = "0.12em"
const ADVANCE_EM             = 0.6 + 0.12
export const LABEL_CANVAS_H  = 160     // texture height in px
const LABEL_PAD_PX           = 32      // horizontal padding each side, in px
export const LABEL_HEIGHT    = 1.4     // world height of the whole texture

const worldPerPx = LABEL_HEIGHT / LABEL_CANVAS_H

const labelTextPx = name => Math.ceil(name.length * ADVANCE_EM * LABEL_FONT_PX)
export const labelCanvasPx = name => labelTextPx(name) + 2 * LABEL_PAD_PX

// Half-width of the visible text in world units, as seen face-on.
export const labelHalfWidth = name => (labelTextPx(name) * worldPerPx) / 2
// World width of the full texture quad
export const labelQuadWidth = name => labelCanvasPx(name) * worldPerPx

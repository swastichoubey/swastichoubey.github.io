// ─── Liquid glass design tokens ───────────────────────────────────────────────
// Apple-style liquid glass: deep blur + saturation boost, a faint refractive
// gradient sheen, a specular top edge, and soft layered depth shadows.
// Dark tint is kept heavy enough that small mono text stays readable.

const BLUR = "blur(28px) saturate(180%)"
const BLUR_LIGHT = "blur(20px) saturate(160%)"

// Main floating panel (right-side panels, reader controls)
export function glassPanel(accent = "#a78bfa") {
  return {
    background: `
      linear-gradient(150deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.015) 38%, rgba(255,255,255,0.00) 62%, ${accent}0d 100%),
      rgba(9, 11, 26, 0.62)`,
    backdropFilter: BLUR,
    WebkitBackdropFilter: BLUR,
    border: "1px solid rgba(255,255,255,0.11)",
    borderRadius: "20px",
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.14),
      inset 0 -1px 0 rgba(255,255,255,0.03),
      inset 1px 0 0 rgba(255,255,255,0.05),
      0 24px 60px rgba(0,0,0,0.55),
      0 4px 14px rgba(0,0,0,0.35),
      0 0 40px ${accent}10`,
  }
}

// Light-theme variant (reader chrome in day mode)
export function glassPanelLight() {
  return {
    background: `
      linear-gradient(150deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 60%, rgba(255,255,255,0.70) 100%)`,
    backdropFilter: BLUR_LIGHT,
    WebkitBackdropFilter: BLUR_LIGHT,
    border: "1px solid rgba(255,255,255,0.85)",
    borderRadius: "20px",
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.95),
      0 16px 40px rgba(15,23,42,0.12),
      0 2px 8px rgba(15,23,42,0.08)`,
  }
}

// Inner content card (highlight cards, education/work cards, social rows)
export function glassCard(color = "#94a3b8") {
  return {
    background: `
      linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.00) 55%),
      ${color}0a`,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: `1px solid ${color}24`,
    borderRadius: "12px",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07)`,
  }
}

// Hover state for inner cards
export function glassCardHover(color = "#94a3b8") {
  return {
    background: `
      linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.01) 55%),
      ${color}16`,
    border: `1px solid ${color}55`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px rgba(0,0,0,0.30), 0 0 18px ${color}14`,
  }
}

// Small floating chip / tooltip / 3D node label
export function glassChip(color = "#94a3b8", strong = false) {
  return {
    background: `
      linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.00) 60%),
      rgba(9, 11, 26, ${strong ? 0.82 : 0.66})`,
    backdropFilter: "blur(12px) saturate(160%)",
    WebkitBackdropFilter: "blur(12px) saturate(160%)",
    border: `1px solid ${color}${strong ? "66" : "33"}`,
    borderRadius: "8px",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 14px rgba(0,0,0,0.40)`,
  }
}

// Edge-docked tab (the "explore" / "controls" vertical handles)
export function glassDock(isDark = true) {
  return isDark
    ? {
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 100%),
          rgba(9, 11, 26, 0.70)`,
        backdropFilter: "blur(16px) saturate(170%)",
        WebkitBackdropFilter: "blur(16px) saturate(170%)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRight: "none",
        borderRadius: "12px 0 0 12px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.45)",
      }
    : {
        background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.70) 100%)",
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
        border: "1px solid rgba(255,255,255,0.9)",
        borderRight: "none",
        borderRadius: "12px 0 0 12px",
        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
      }
}

// ─── Motion / easing tokens ───────────────────────────────────────────────────
// Shared spring + ease-out curves so every surface moves with the same physics.

export const SPRING = {
  // Panel entrances — gentle, slightly under-damped so it settles with life
  panel:  { type: "spring", stiffness: 320, damping: 30, mass: 0.9 },
  // Tab indicator / small UI — snappy
  snappy: { type: "spring", stiffness: 500, damping: 34, mass: 0.7 },
  // Content swaps — soft
  soft:   { type: "spring", stiffness: 240, damping: 28, mass: 1 },
}

export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"      // easeOutQuint-ish
export const EASE_OUT_SOFT = "cubic-bezier(0.33, 1, 0.68, 1)" // easeOutCubic

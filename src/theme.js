// ─── SWAP ANY COLOR HERE — everything in the app pulls from this object ───

export const THEME = {
  // Article type colors — distinct, readable on near-black
  exploratory:     "#a78bfa",  // soft purple
  implementation:  "#fbbf24",  // amber gold
  opinion:         "#34d399",  // mint green
  project:         "#f87171",  // soft red-coral

  // Supporting
  ref:             "#94a3b8",  // visible slate-blue (was too dark)
  about:           "#f8fafc",  // pure white

  // Edge colors — much brighter than before
  edgeDefault:     "#1e3a5f",  // visible dark blue
  edgeHighlight:   "#a78bfa",  // matches exploratory purple

  // Atmosphere halo opacity
  haloOpacity:     0.10,

  // Emissive intensities
  emissiveMain:    0.25,
  emissiveHover:   0.70,
  emissiveRef:     0.12,      // bumped up so moons are visible
}

export const TYPE_LABELS = {
  exploratory:    "Exploratory",
  implementation: "Implementation",
  opinion:        "Opinion",
  project:        "Project",
  about:          "About",
  ref:            "Reference",
}

export const DESTINATION_ICONS = {
  substack:   "S",
  lesswrong:  "LW",
  x:          "𝕏",
  native:     "↗",
  html: "↗"
}

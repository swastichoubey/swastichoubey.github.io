// ─── Visual encodings ────────────────────────────────────────────────────────
// Every planet property maps to article data:
//   surface + color → type        (theme.js / planetMaterials.js)
//   radius          → read time   (planetRadius)
//   glow            → recency     (recencyGlow)

// Read time → radius, sqrt-scaled so area (not diameter) tracks length, and
// clamped so a 4-minute piece stays a comfortable click target while a
// 20-minute one doesn't swallow its neighbours.
const RADIUS_MIN = 0.45, RADIUS_MAX = 1.1
const READ_MIN = 3, READ_MAX = 20

export function planetRadius(readTime = READ_MIN) {
  const t = (Math.sqrt(readTime) - Math.sqrt(READ_MIN)) / (Math.sqrt(READ_MAX) - Math.sqrt(READ_MIN))
  return RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * Math.min(Math.max(t, 0), 1)
}

// Publish month → glow in [GLOW_FLOOR, 1]. Newest is brightest, easing down
// over ~6 months and then holding at the floor, so old pieces still read as
// lit bodies rather than dead rock. Computed at view time, so glow fades on
// its own as articles age.
const GLOW_FLOOR = 0.15
const GLOW_DECAY_MONTHS = 6
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

export function recencyGlow(date, now = Date.now()) {
  if (!date) return GLOW_FLOOR
  const [year, month = 1] = date.split("-").map(Number)
  // Dates are month-precision; treat them as mid-month.
  const ageMonths = Math.max(0, (now - new Date(year, month - 1, 15).getTime()) / MS_PER_MONTH)
  const x = Math.min(ageMonths / GLOW_DECAY_MONTHS, 1)
  const eased = 1 - x * x * (3 - 2 * x)   // smoothstep falloff
  return GLOW_FLOOR + (1 - GLOW_FLOOR) * eased
}

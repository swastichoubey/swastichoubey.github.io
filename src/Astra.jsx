import { useEffect, useRef, useState, useCallback } from "react"
import rig from "./assets/astra/rig.json"
import { useReducedMotion } from "./useReducedMotion"

// ─── Astra ───────────────────────────────────────────────────────────────────
// The mascot, bottom-left of the universe, assembled from layers exported by
// scripts/astra/export_rig.py (positions in rig.json, export pixels).
//
// Rest:   gentle bob + tilt, lids at 45% (eye stars hidden), wavy mouth,
//         sweat, drifting zzz, a blink every 4–8s.
// Awake:  when the cursor comes within ~150px or Astra has keyboard focus —
//         lids retract, zzz drifts up and fades, sweat fades, mouth goes to
//         surprise for ~1s then crossfades to a smile, the cup wiggles once,
//         eye stars appear and track the cursor.
//         Back to rest ~3s after the cursor leaves.
// Click / Enter opens the About panel.
// Reduced motion: no bob, blink or tracking; rest ↔ awake is an instant swap
//         (straight to the smile, no surprise step).
// Everything animates with CSS transforms and opacity.

const urls = import.meta.glob("./assets/astra/*.webp", { eager: true, import: "default" })
const src = name => urls[`./assets/astra/${name}.webp`]

const DISPLAY_W = 240
const k = DISPLAY_W / rig.size[0]                     // export px → CSS px
const DISPLAY_H = rig.size[1] * k
const px = v => v * k

const WAKE_RADIUS = 150          // px from Astra's body
const SLEEP_DELAY = 3000         // ms after the cursor leaves
const TRACK_RANGE = 0.3          // stars move up to 30% of the oval's half-extent
const BLINK_MS = 75              // each way
const LID = { rest: rig.lid.rest_frac, closed: 1, open: 0 }
const SURPRISE_MS = 1000         // surprise mouth on waking, then the smile
const MOUTH_FADE = { wavy: 160, surprise: 160, smile: 200 }   // crossfade into each mouth
const lineRGB = `rgb(${rig.lid.line_rgb.join(",")})`

// Lid shutter: a box as tall as the eye plus its curved bottom (the lid edge,
// drawn by the bottom border), slid down by translateY; the skin inside is
// counter-translated so its shading stays put. frac 0 = open, 1 = closed.
function shutterOffset(frac, h, sag) {
  return (frac - 1) * h - (1 - frac) * (sag + 1)
}

function Lid({ eye, frac, durationMs }) {
  const [x, y, w, h] = eye.box.map(px)
  const sag = rig.lid.sag * h
  const line = Math.max(1, px(rig.lid.line_px))
  const ty = shutterOffset(frac, h, sag)
  const transition = `transform ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`
  const mask = `url(${src(`eyemask_${eye.name}`)})`
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden",
      maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, width: w, height: h + sag, boxSizing: "border-box",
        overflow: "hidden", borderBottom: `${line}px solid ${lineRGB}`,
        borderBottomLeftRadius: `50% ${sag}px`, borderBottomRightRadius: `50% ${sag}px`,
        transform: `translateY(${ty}px)`, transition, willChange: "transform",
      }}>
        <img src={src(`lidskin_${eye.name}`)} alt="" draggable={false} style={{
          position: "absolute", left: 0, top: 0, width: w, height: h,
          transform: `translateY(${-ty}px)`, transition, willChange: "transform",
        }} />
      </div>
    </div>
  )
}

// A full-frame layer (every exported layer shares the rig's frame)
function Layer({ name, style, className, innerRef }) {
  return <img ref={innerRef} src={src(name)} alt="" draggable={false} className={className}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }} />
}

// transform-origin at a layer's own centre / bottom, in CSS px of the frame
const origin = (name, atBottom = false) => {
  const { centre: [cx, cy], size: [, h] } = rig.layers[name]
  return `${px(cx)}px ${px(atBottom ? cy + h / 2 : cy)}px`
}

export default function Astra({ onOpen }) {
  const reduced = useReducedMotion()
  const [awake, setAwake] = useState(false)
  const [lid, setLid] = useState(LID.rest)
  const [lidMs, setLidMs] = useState(280)
  const [wiggle, setWiggle] = useState(0)             // bumps to replay the cup wiggle
  const [mouth, setMouth] = useState("wavy")          // "wavy" | "surprise" | "smile"
  const rootRef = useRef(null)
  const starRefs = { left: useRef(null), right: useRef(null) }
  const pointer = useRef(null)                         // last cursor position (client px)
  const focused = useRef(false)
  const sleepTimer = useRef(null)
  const awakeRef = useRef(false)
  awakeRef.current = awake

  // ── Wake / sleep ──────────────────────────────────────────────────────────
  const wake = useCallback(() => {
    clearTimeout(sleepTimer.current)
    if (!awakeRef.current) { setAwake(true); setWiggle(n => n + 1) }
  }, [])
  const sleepSoon = useCallback(() => {
    clearTimeout(sleepTimer.current)
    sleepTimer.current = setTimeout(() => { if (!focused.current) setAwake(false) }, SLEEP_DELAY)
  }, [])

  useEffect(() => {
    setLidMs(reduced ? 0 : 280)
    setLid(awake ? LID.open : LID.rest)
    if (!awake) { setMouth("wavy"); return }
    if (reduced) { setMouth("smile"); return }
    setMouth("surprise")
    const t = setTimeout(() => setMouth("smile"), SURPRISE_MS)
    return () => clearTimeout(t)
  }, [awake, reduced])

  // Distance from the cursor to Astra's drawn body (not the transparent margin)
  useEffect(() => {
    const onMove = e => {
      pointer.current = { x: e.clientX, y: e.clientY }
      const el = rootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const b = rig.layers.base
      const bx0 = r.left + px(b.centre[0] - b.size[0] / 2), bx1 = r.left + px(b.centre[0] + b.size[0] / 2)
      const by0 = r.top + px(b.centre[1] - b.size[1] / 2), by1 = r.top + px(b.centre[1] + b.size[1] / 2)
      const dx = Math.max(bx0 - e.clientX, 0, e.clientX - bx1)
      const dy = Math.max(by0 - e.clientY, 0, e.clientY - by1)
      if (Math.hypot(dx, dy) <= WAKE_RADIUS) wake()
      else if (awakeRef.current) sleepSoon()
    }
    const onLeave = () => { pointer.current = null; if (awakeRef.current) sleepSoon() }
    window.addEventListener("pointermove", onMove)
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      clearTimeout(sleepTimer.current)
    }
  }, [wake, sleepSoon])

  // ── Blink every 4–8s at rest ──────────────────────────────────────────────
  const blink = useCallback(() => {
    setLidMs(BLINK_MS); setLid(LID.closed)
    setTimeout(() => setLid(awakeRef.current ? LID.open : LID.rest), BLINK_MS)
    setTimeout(() => setLidMs(280), BLINK_MS * 2)
  }, [])
  useEffect(() => {
    if (reduced || awake) return
    let t
    const schedule = () => { t = setTimeout(() => { blink(); schedule() }, 4000 + Math.random() * 4000) }
    schedule()
    return () => clearTimeout(t)
  }, [reduced, awake, blink])

  // ── Eye stars follow the cursor while awake, eased, clamped in the ovals ──
  useEffect(() => {
    if (reduced) {
      for (const r of Object.values(starRefs)) if (r.current) r.current.style.transform = ""
      return
    }
    const off = Object.fromEntries(rig.eyes.map(e => [e.name, { x: 0, y: 0 }]))
    let raf, last = performance.now()
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const el = rootRef.current
      let moving = false
      for (const eye of rig.eyes) {
        let tx = 0, ty = 0
        if (awakeRef.current && pointer.current && el) {
          const r = el.getBoundingClientRect()
          // direction from the eye to the cursor, full range beyond ~250px
          const ex = r.left + px(eye.centre[0]), ey = r.top + px(eye.centre[1])
          const vx = pointer.current.x - ex, vy = pointer.current.y - ey
          const d = Math.hypot(vx, vy) || 1
          const reach = Math.min(1, d / 250)
          tx = (vx / d) * reach * TRACK_RANGE * eye.half[0]
          ty = (vy / d) * reach * TRACK_RANGE * eye.half[1]
          // keep the whole star inside the oval: clamp its centre to a shrunken ellipse
          const ax = eye.half[0] - eye.star_size[0] / 2 - 1, ay = eye.half[1] - eye.star_size[1] / 2 - 1
          const sx = eye.star_rest[0] + tx - eye.centre[0], sy = eye.star_rest[1] + ty - eye.centre[1]
          const q = (sx * sx) / (ax * ax) + (sy * sy) / (ay * ay)
          if (q > 1) {
            const f = 1 / Math.sqrt(q)
            tx = eye.centre[0] + sx * f - eye.star_rest[0]
            ty = eye.centre[1] + sy * f - eye.star_rest[1]
          }
        }
        const o = off[eye.name]
        const a = 1 - Math.exp(-dt * 10)
        o.x += (tx - o.x) * a; o.y += (ty - o.y) * a
        if (Math.abs(tx - o.x) > 0.01 || Math.abs(ty - o.y) > 0.01) moving = true
        const node = starRefs[eye.name].current
        if (node) node.style.transform = `translate(${px(o.x)}px, ${px(o.y)}px)`
      }
      if (awakeRef.current || moving) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [awake, reduced])

  // Dev-only handle for automated checks
  useEffect(() => { if (import.meta.env.DEV) window.__astra = { blink, get awake() { return awakeRef.current } } })

  const open = () => onOpen?.()
  const fast = reduced ? "0ms" : undefined

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label="About Swasti"
      className={`astra${awake ? " astra--awake" : ""}${reduced ? " astra--still" : ""}`}
      onClick={open}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open() } }}
      onFocus={() => { focused.current = true; wake() }}
      onBlur={() => { focused.current = false; sleepSoon() }}
      style={{
        position: "fixed", left: "8px", bottom: "12px", zIndex: 20,
        width: DISPLAY_W, height: DISPLAY_H, cursor: "pointer", userSelect: "none",
      }}
    >
      <div className="astra-bob" style={{ position: "absolute", inset: 0, transformOrigin: origin("base", true) }}>
        <div className="astra-tilt" style={{ position: "absolute", inset: 0, transformOrigin: origin("base", true) }}>
          <Layer name="base" />
          {rig.eyes.map(eye => (
            <Layer key={eye.name} name={`star_${eye.name}`} innerRef={starRefs[eye.name]} className="astra-awake-only"
              style={{ willChange: "transform", transitionDuration: fast }} />
          ))}
          {rig.eyes.map(eye => <Lid key={eye.name} eye={eye} frac={lid} durationMs={lidMs} />)}
          {["wavy", "surprise", "smile"].map(m => (
            <Layer key={m} name={m} style={{
              opacity: mouth === m ? 1 : 0,
              transition: `opacity ${reduced ? 0 : MOUTH_FADE[mouth]}ms ease`,
            }} />
          ))}
          <Layer name="sweat" className="astra-rest-only astra-sweat" style={{ transitionDuration: fast }} />
          <div className="astra-zzz" style={{ position: "absolute", inset: 0, transitionDuration: fast }}>
            <Layer name="zzz" className="astra-zzz-float" style={{ transformOrigin: origin("zzz") }} />
          </div>
          <Layer key={wiggle} name="cup" className={wiggle && !reduced ? "astra-cup-wiggle" : ""}
            style={{ transformOrigin: origin("cup", true) }} />
        </div>
      </div>

      <style>{`
        .astra:focus-visible { outline: 2px solid #a78bfa; outline-offset: 2px; border-radius: 14px; }
        .astra-bob  { animation: astra-bob 4.8s ease-in-out infinite; will-change: transform; }
        .astra-tilt { animation: astra-tilt 7.3s ease-in-out infinite; will-change: transform; }
        @keyframes astra-bob  { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes astra-tilt { 0%, 100% { transform: rotate(0deg) } 30% { transform: rotate(-1.4deg) } 70% { transform: rotate(1deg) } }

        .astra-rest-only, .astra-awake-only { transition: opacity 160ms ease; }
        .astra-awake-only { opacity: 0; }
        .astra--awake .astra-rest-only { opacity: 0; }
        .astra--awake .astra-awake-only { opacity: 1; }
        .astra--awake .astra-sweat { transition-duration: 350ms; }

        .astra-zzz { transition: transform 900ms ease-out, opacity 700ms ease-out; }
        .astra--awake .astra-zzz { transform: translateY(-18px); opacity: 0; }
        .astra-zzz-float { animation: astra-zzz 3.4s ease-in-out infinite; }
        @keyframes astra-zzz {
          0%, 100% { transform: translate(0, 0); opacity: 0.85 }
          50%      { transform: translate(2px, -5px); opacity: 1 }
        }

        .astra-cup-wiggle { animation: astra-wiggle 620ms ease-in-out 1; }
        @keyframes astra-wiggle {
          0%, 100% { transform: rotate(0) } 20% { transform: rotate(-6deg) }
          45% { transform: rotate(5deg) } 70% { transform: rotate(-2.5deg) } 85% { transform: rotate(1deg) }
        }

        .astra--still .astra-bob, .astra--still .astra-tilt, .astra--still .astra-zzz-float { animation: none; }
        .astra--still .astra-zzz { transition: none; transform: none; }
        .astra--still .astra-rest-only, .astra--still .astra-awake-only { transition: none; }
      `}</style>
    </div>
  )
}

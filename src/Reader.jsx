import { useState, useEffect, useRef, Fragment } from "react"
import { motion, AnimatePresence } from "motion/react"
import { THEME, TYPE_LABELS } from "./theme"
import { ARTICLES } from "./readerContent"
import { ARTICLES as GENERATED_ARTICLES } from "./readerContent.generated"
import { glassPanel, glassPanelLight, SPRING, EASE_OUT } from "./glass"
import emailjs from "@emailjs/browser"

// readerContent.js holds whatever hasn't been converted to Markdown yet;
// readerContent.generated.js is compiled from content/articles/*.md by
// scripts/build-content.js (run automatically before every dev/build).
// Generated entries win on id collisions.
const ACTIVE_ARTICLES = { ...ARTICLES, ...GENERATED_ARTICLES }

// One brand accent per theme — replaces the old per-article-type color for
// all reader chrome (progress bar, type dot, kicker). The type itself still
// shows as a text label, just not as a separate color.
const PALETTE = {
  light: {
    bg: "#faf6ee", text: "#0f0f0f", muted: "#8a8578",
    accent: "#8B0000", border: "#e5ddc9",
  },
  dark: {
    bg: "#05050f", text: "#e1f0f0", muted: "#5f8080",
    accent: "#008B8B", border: "#123433",
  },
}

const NAV_HEIGHT = 68

// ─── Vertical scroll-progress bar (LessWrong/AF-style, left edge) ─────────────
function ProgressBar({ accent }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = document.getElementById("reader-scroll")
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const pct = scrollHeight <= clientHeight ? 100
        : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
      setProgress(pct)
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: "3px", zIndex: 200, background: "transparent",
    }}>
      <div style={{
        width: "100%", height: `${progress}%`,
        background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
        boxShadow: `0 0 8px ${accent}88`,
        transition: "height 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
      }} />
    </div>
  )
}

// ─── Mascot chrome slot ────────────────────────────────────────────────────────
// Static redesigned asset for this pass — swap `src` here later for an
// animated version without touching any layout that uses this component.
function ReaderMascot({ size = 26 }) {
  return (
    <img
      src="/src/assets/astra_reading.png"
      width={size} height={size}
      style={{ display: "block", objectFit: "contain" }}
      alt="Hybridantic"
    />
  )
}

// ─── Sparkle hover — same effect as SparkleButton, recolored to the reader's
// per-theme accent. A single shared <style> (rendered once by SparkleStyle)
// backs every button carrying the "rd-sparkle" class + <Sparkles/> children.
function Sparkles() {
  return (
    <>
      <span className="rd-spark rd-spark-1">✦</span>
      <span className="rd-spark rd-spark-2">✦</span>
      <span className="rd-spark rd-spark-3">✦</span>
    </>
  )
}

function SparkleStyle({ accent }) {
  return (
    <style>{`
      .rd-sparkle { position: relative; overflow: visible; }
      .rd-spark { position: absolute; opacity: 0; color: #fffdef; pointer-events: none; transition: opacity 0.2s ease; }
      .rd-spark-1 { top: -9px; left: -7px; font-size: 12px; animation: rd-twinkle 1.4s ease-in-out infinite; }
      .rd-spark-2 { bottom: -7px; left: 42%; font-size: 7px; animation: rd-twinkle 1.8s ease-in-out infinite 0.3s; }
      .rd-spark-3 { top: 6px; right: -9px; font-size: 10px; animation: rd-twinkle 1.2s ease-in-out infinite 0.6s; }
      .rd-sparkle:hover .rd-spark { opacity: 1; filter: drop-shadow(0 0 5px #fffdef); }
      .rd-sparkle:hover { box-shadow: 0 0 14px ${accent}55; border-color: ${accent} !important; }
      @keyframes rd-twinkle {
        0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.6; }
        50%       { transform: scale(1.2) rotate(15deg); opacity: 1; }
      }
    `}</style>
  )
}

// ─── Top nav bar — back, brand, theme toggle, settings gear ──────────────────
function NavBar({ backLabel, onClose, isDark, onToggleTheme, gearOpen, onToggleGear }) {
  const p = isDark ? PALETTE.dark : PALETTE.light
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: `${NAV_HEIGHT}px`,
      zIndex: 160, display: "flex", alignItems: "center", gap: "18px",
      padding: "0 24px 0 28px",
      ...(isDark ? glassPanel(p.accent) : glassPanelLight()),
      borderRadius: 0,
    }}>
      <motion.button
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        onClick={onClose}
        title={`Back to ${backLabel}`}
        aria-label={`Back to ${backLabel}`}
        style={{
          background: "none", border: `1px solid ${p.border}`, borderRadius: "8px",
          width: "38px", height: "38px", cursor: "pointer",
          color: p.text, fontFamily: "'DM Mono', monospace",
          fontSize: "20px", lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >{"<"}</motion.button>

      <div style={{ width: "1px", height: "26px", background: p.border, flexShrink: 0 }} />

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <ReaderMascot size={40} />
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: "17px", fontWeight: 600,
          letterSpacing: "0.02em", color: p.text,
        }}>Hybridantic</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <button
          onClick={onToggleTheme}
          title={isDark ? "Switch to light" : "Switch to dark"}
          style={{
            background: "none", border: `1px solid ${p.border}`, borderRadius: "8px",
            width: "38px", height: "38px", cursor: "pointer",
            color: p.text, fontSize: "17px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >{isDark ? "☀" : "☾"}</button>
        <button
          onClick={onToggleGear}
          title="Font & size"
          style={{
            background: gearOpen ? `${p.accent}18` : "none",
            border: `1px solid ${gearOpen ? p.accent + "55" : p.border}`,
            borderRadius: "8px", width: "38px", height: "38px", cursor: "pointer",
            color: gearOpen ? p.accent : p.text, fontSize: "17px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >⚙</button>
      </div>
    </div>
  )
}

// ─── Settings popup — font / size (opened from the nav bar gear) ─────────────
function SettingsMenu({ settings, onChange, isDark }) {
  const p = isDark ? PALETTE.dark : PALETTE.light

  const Row = ({ label, options, value, setter }) => (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ fontSize: "8px", color: p.muted, letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", gap: "4px" }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => setter(opt.value)} style={{
            flex: 1, padding: "5px 0", borderRadius: "5px",
            border: `1px solid ${value === opt.value ? p.accent + "55" : p.border}`,
            background: value === opt.value ? `${p.accent}18` : "transparent",
            color: value === opt.value ? p.accent : p.muted,
            fontSize: "9px", fontFamily: "'DM Mono', monospace",
            cursor: "pointer", letterSpacing: "0.04em",
            transition: `all 0.25s ${EASE_OUT}`,
          }}>{opt.label}</button>
        ))}
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={SPRING.snappy}
      style={{
        position: "fixed", top: `${NAV_HEIGHT + 8}px`, right: "20px", width: "170px",
        ...(isDark ? glassPanel(p.accent) : glassPanelLight()),
        borderRadius: "12px", padding: "14px", zIndex: 159,
      }}
    >
      <Row label="Font" options={[
          { label: "Sans", value: "sans" }, { label: "Mono", value: "mono" }, { label: "Serif", value: "serif" },
        ]}
        value={settings.font} setter={v => onChange({ ...settings, font: v })} />
      <Row label="Size" options={[
          { label: "S", value: "sm" }, { label: "M", value: "md" }, { label: "L", value: "lg" },
        ]}
        value={settings.size} setter={v => onChange({ ...settings, size: v })} />
    </motion.div>
  )
}

// ─── Byline — type · author · date · read time (+ optional meta / Substack) ──
function Byline({ article, isDark, accent }) {
  const p = isDark ? PALETTE.dark : PALETTE.light
  const dotStyle = { fontSize: "11px", color: p.muted }
  // Deliberately NOT the theme accent — this dot identifies the article's
  // category (opinion/exploratory/experimental/project) via the same fixed
  // per-type color used everywhere else in the app, and stays constant
  // across light/dark mode.
  const typeColor = THEME[article.type] || THEME.about
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%",
          background: typeColor, boxShadow: `0 0 6px ${typeColor}` }} />
        <span style={{ fontSize: "11px", color: p.muted, letterSpacing: "0.12em",
          textTransform: "uppercase" }}>{TYPE_LABELS[article.type]}</span>
        <span style={dotStyle}>·</span>
        <span style={dotStyle}>Swasti Choubey</span>
        <span style={dotStyle}>·</span>
        <span style={dotStyle}>{article.date}</span>
        <span style={dotStyle}>·</span>
        <span style={dotStyle}>{article.readTime} min read</span>
        {article.meta?.map((m, i) => (
          <Fragment key={i}>
            <span style={dotStyle}>·</span>
            <span style={dotStyle}>{m.label}: {m.value}</span>
          </Fragment>
        ))}
      </div>
      {article.substackUrl && (
        <a href={article.substackUrl} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", marginTop: "8px", fontSize: "11px",
          color: accent, textDecoration: "none", fontFamily: "'DM Mono', monospace",
        }}>Crossposted on Substack ↗</a>
      )}
    </div>
  )
}

// ─── Like / Share / Feedback action row ───────────────────────────────────────
const actionBtnStyle = (p, active) => ({
  display: "flex", alignItems: "center", gap: "6px",
  background: active ? `${p.accent}14` : "none",
  border: `1px solid ${active ? p.accent + "66" : p.border}`,
  borderRadius: "20px", padding: "5px 12px", cursor: "pointer",
  color: active ? p.accent : p.muted,
  fontFamily: "'DM Mono', monospace", fontSize: "10px",
  transition: `all 0.25s ${EASE_OUT}`,
})

// Round icon-only button — used for Like, to match the reference layout's
// circular heart/comment/repost icons.
const iconBtnStyle = (p, active) => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "36px", height: "36px", borderRadius: "50%",
  background: active ? `${p.accent}14` : "none",
  border: `1px solid ${active ? p.accent + "66" : p.border}`,
  cursor: "pointer",
  color: active ? p.accent : p.muted,
  fontSize: "15px",
  transition: `all 0.25s ${EASE_OUT}`,
})

// Local-state only — there's no backend yet to persist likes across visits/viewers.
// Hover previews the filled heart + accent color; the actual "liked" state
// (from a click) keeps that same look after the pointer leaves.
function LikeButton({ isDark }) {
  const p = isDark ? PALETTE.dark : PALETTE.light
  const [liked, setLiked] = useState(false)
  const [hovered, setHovered] = useState(false)
  const filled = liked || hovered
  return (
    <button
      className="rd-sparkle"
      onClick={() => setLiked(l => !l)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={liked ? "Unlike" : "Like"}
      aria-label={liked ? "Unlike" : "Like"}
      style={iconBtnStyle(p, filled)}
    >
      {filled ? "♥" : "♡"}
      <Sparkles />
    </button>
  )
}

function ShareButton({ isDark }) {
  const p = isDark ? PALETTE.dark : PALETTE.light
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access denied/unavailable — nothing sensible to fall back to.
    }
  }
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        className="rd-sparkle"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={actionBtnStyle(p, copied || hovered)}
      >↗ Share<Sparkles /></button>
      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", left: "100%", top: "50%", translateY: "-50%",
              marginLeft: "8px", whiteSpace: "nowrap",
              background: p.accent, color: isDark ? "#05050f" : "#faf6ee",
              fontSize: "9px", fontFamily: "'DM Mono', monospace",
              padding: "4px 8px", borderRadius: "6px", zIndex: 2,
            }}
          >Link Copied!</motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

// Sends via EmailJS, same as the AboutPanel contact form — but through a
// dedicated "reader feedback" template rather than the contact-form one.
const FEEDBACK_TEMPLATE_ID = "template_14767sp"

function FeedbackModal({ isDark, onClose, articleTitle }) {
  const p = isDark ? PALETTE.dark : PALETTE.light
  const formRef = useRef()
  const [status, setStatus] = useState(null)

  const sendEmail = async e => {
    e.preventDefault()
    setStatus("sending")
    try {
      await emailjs.sendForm(
        "service_y8v13ae",
        FEEDBACK_TEMPLATE_ID,
        formRef.current,
        "lc5LMt9P3CWcP9Zei"
      )
      setStatus("sent")
      formRef.current.reset()
    } catch {
      setStatus("error")
    }
  }

  // No backdrop-filter here — it already sits on the blurred overlay below,
  // and nesting another backdrop-filter on top of that one breaks rendering
  // (confirmed: the element painted nothing at all, in headless Chromium and
  // per known cross-browser nested-backdrop-filter issues generally).
  const inputStyle = {
    width: "100%",
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
    border: `1px solid ${p.border}`, borderRadius: "6px",
    padding: "8px 10px", color: p.text,
    fontSize: "11px", fontFamily: "'DM Mono', monospace",
    outline: "none", marginBottom: "8px", boxSizing: "border-box",
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: isDark ? "rgba(5,5,15,0.45)" : "rgba(250,246,238,0.45)",
        backdropFilter: "blur(8px) saturate(140%)",
        WebkitBackdropFilter: "blur(8px) saturate(140%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={SPRING.panel}
        onClick={e => e.stopPropagation()}
        style={{
          width: "340px", maxWidth: "90vw",
          ...(isDark ? glassPanel(p.accent) : glassPanelLight()),
          backdropFilter: "none", WebkitBackdropFilter: "none",
          borderRadius: "16px", padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
          <span style={{ fontSize: "11px", color: p.text, fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.06em" }}>Have feedback?</span>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: p.muted, cursor: "pointer", fontSize: "14px",
          }}>✕</button>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "18px", marginBottom: "8px" }}>✓</div>
            <div style={{ fontSize: "11px", color: p.muted, fontFamily: "'DM Mono', monospace" }}>
              Thanks — got it.
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={sendEmail}>
            <input type="hidden" name="title" value={articleTitle} />
            <input type="text" name="name" placeholder="Name" required style={inputStyle} />
            <input type="email" name="email" placeholder="Email" required style={inputStyle} />
            <textarea name="message" placeholder="Your feedback" rows={4} required
              style={{ ...inputStyle, resize: "vertical" }} />
            <button className="rd-sparkle" type="submit" disabled={status === "sending"} style={{
              width: "100%", padding: "9px 0", marginTop: "4px",
              background: p.accent, border: "1px solid transparent", borderRadius: "7px",
              color: isDark ? "#05050f" : "#faf6ee",
              fontFamily: "'DM Mono', monospace", fontSize: "11px",
              cursor: "pointer", opacity: status === "sending" ? 0.6 : 1,
            }}>{status === "sending" ? "Sending…" : "Send"}<Sparkles /></button>
            {status === "error" && (
              <div style={{ fontSize: "9px", color: "#ef4444", marginTop: "8px", textAlign: "center" }}>
                Something went wrong. Email me directly at swastichoubey83@gmail.com
              </div>
            )}
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

function FeedbackButton({ isDark, articleTitle }) {
  const p = isDark ? PALETTE.dark : PALETTE.light
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  return (
    <>
      <button
        className="rd-sparkle"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={actionBtnStyle(p, hovered)}
      >✉ Have feedback?<Sparkles /></button>
      <AnimatePresence>
        {open && <FeedbackModal isDark={isDark} onClose={() => setOpen(false)} articleTitle={articleTitle} />}
      </AnimatePresence>
    </>
  )
}

function ActionRow({ isDark, articleTitle }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "8px", marginTop: "4px", marginBottom: "32px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <LikeButton isDark={isDark} />
        <FeedbackButton isDark={isDark} articleTitle={articleTitle} />
      </div>
      <ShareButton isDark={isDark} />
    </div>
  )
}

// ─── Inline markdown — links, bare URLs, **bold**, *italic*, `code` ───────────
// Order matters: **bold** must be tried before *italic* so `**x**` doesn't
// get read as two empty italic runs.
const INLINE_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g

function renderInline(text, isDark, accent) {
  const linkColor = accent
  const codeColor = isDark ? "#7dd3fc" : "#0369a1"
  const codeBg    = isDark ? "#080c14" : "#f1f5f9"
  const codeBdr   = isDark ? "#1e293b" : "#e2e8f0"

  const parts = []
  let lastIndex = 0
  let match
  let key = 0
  INLINE_PATTERN.lastIndex = 0
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const [, linkLabel, linkUrl, bareUrl, bold, code, italic] = match

    if (linkLabel !== undefined || bareUrl !== undefined) {
      const url   = linkUrl || bareUrl
      const label = linkLabel || bareUrl
      parts.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer"
          style={{ color: linkColor, textDecoration: "underline", textUnderlineOffset: "2px", overflowWrap: "anywhere" }}>
          {label}
        </a>
      )
    } else if (bold !== undefined) {
      parts.push(<strong key={key++} style={{ fontWeight: 600 }}>{bold}</strong>)
    } else if (code !== undefined) {
      parts.push(
        <code key={key++} style={{
          fontFamily: "'DM Mono', monospace", fontSize: "0.9em",
          color: codeColor, background: codeBg,
          border: `1px solid ${codeBdr}`, borderRadius: "4px", padding: "2px 5px",
        }}>{code}</code>
      )
    } else if (italic !== undefined) {
      parts.push(<em key={key++}>{italic}</em>)
    }
    lastIndex = INLINE_PATTERN.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

// ─── Content block renderer ───────────────────────────────────────────────────
function Block({ block, fonts, sizes, isDark, accent }) {
  const prose = isDark ? "#cbd5e1" : "#334155"
  const head  = isDark ? "#f8fafc" : "#0f172a"
  const muted = isDark ? "#475569" : "#94a3b8"
  const quoteBg  = isDark ? "#0f172a" : "#f8fafc"
  const codeBg   = isDark ? "#080c14" : "#f1f5f9"
  const borderClr = isDark ? "#1e293b" : "#e2e8f0"

  switch (block.type) {
    case "heading":
      return <h2 style={{ fontFamily: fonts.heading, fontSize: sizes.h2,
        color: head, fontWeight: 600, margin: "2em 0 0.6em", lineHeight: 1.3,
        overflowWrap: "anywhere" }}>{renderInline(block.text, isDark, accent)}</h2>

    case "subheading":
      return <h3 style={{ fontFamily: fonts.body, fontSize: sizes.h3,
        color: head, fontWeight: 500, margin: "1.6em 0 0.5em", lineHeight: 1.4,
        overflowWrap: "anywhere" }}>{renderInline(block.text, isDark, accent)}</h3>

    case "paragraph":
      return <p style={{ fontFamily: fonts.body, fontSize: sizes.body,
        color: prose, lineHeight: 1.85, margin: "0 0 1.2em",
        overflowWrap: "anywhere" }}>{renderInline(block.text, isDark, accent)}</p>

    case "quote":
      return (
        <blockquote style={{
          margin: "1.8em 0", padding: "14px 20px",
          background: quoteBg, borderLeft: `3px solid ${accent}`,
          borderRadius: "0 8px 8px 0",
        }}>
          <p style={{ fontFamily: fonts.body, fontSize: sizes.body,
            color: accent, lineHeight: 1.75,
            margin: 0, fontStyle: "italic",
            overflowWrap: "anywhere" }}>{renderInline(block.text, isDark, accent)}</p>
          {block.source && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
              color: muted, marginTop: "10px", overflowWrap: "anywhere" }}>
              {renderInline(block.source, isDark, accent)}
            </div>
          )}
        </blockquote>
      )

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul"
      return (
        <ListTag style={{ margin: "0 0 1.2em", paddingLeft: "1.3em" }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ fontFamily: fonts.body, fontSize: sizes.body,
              color: prose, lineHeight: 1.85, marginBottom: "0.5em",
              overflowWrap: "anywhere" }}>{renderInline(item, isDark, accent)}</li>
          ))}
        </ListTag>
      )
    }

    case "code":
      return (
        <pre style={{
          background: codeBg, borderRadius: "8px",
          padding: "16px", margin: "1.4em 0",
          overflowX: "auto",
          border: `1px solid ${borderClr}`,
        }}>
          <code style={{
            fontFamily: "'DM Mono', monospace", fontSize: "12px",
            color: isDark ? "#7dd3fc" : "#0369a1", lineHeight: 1.7,
          }}>{block.text}</code>
        </pre>
      )

    case "divider":
      return block.label ? (
        <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "3em 0" }}>
          <div style={{ flex: 1, height: "1px", background: borderClr }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px",
            letterSpacing: "0.16em", textTransform: "uppercase", color: muted,
            whiteSpace: "nowrap" }}>{block.label}</span>
          <div style={{ flex: 1, height: "1px", background: borderClr }} />
        </div>
      ) : (
        <hr style={{ border: "none", borderTop: `1px solid ${borderClr}`, margin: "2.5em 0" }} />
      )

    case "table":
      return (
        <div style={{
          overflowX: "auto", margin: "1.6em 0",
          border: `1px solid ${borderClr}`,
          borderRadius: "6px",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse",
            fontFamily: "'DM Mono', monospace", fontSize: "12px" }}>
            {block.headers && (
              <thead>
                <tr style={{ background: isDark ? "#080c14" : "#f8fafc",
                  borderBottom: `1px solid ${borderClr}` }}>
                  {block.headers.map((h, i) => (
                    <th key={i} style={{ padding: "9px 14px", textAlign: "left",
                      color: isDark ? "#94a3b8" : "#64748b",
                      fontWeight: 500, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {renderInline(h, isDark, accent)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < block.rows.length - 1
                  ? `1px solid ${isDark ? "#0f172a" : "#f1f5f9"}` : "none" }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: "8px 14px",
                      color: isDark ? "#cbd5e1" : "#334155", verticalAlign: "top" }}>
                      {renderInline(cell, isDark, accent)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case "callout":
      return (
        <div style={{
          background: `${accent}12`,
          borderLeft: `2px solid ${accent}`,
          padding: "16px 20px", margin: "1.8em 0", borderRadius: "0 8px 8px 0",
        }}>
          {block.label && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px",
              letterSpacing: "0.1em", textTransform: "uppercase", color: accent,
              marginBottom: "8px" }}>{block.label}</div>
          )}
          <p style={{ fontFamily: fonts.body, fontSize: sizes.body,
            color: prose, lineHeight: 1.8, margin: 0,
            overflowWrap: "anywhere" }}>{renderInline(block.text, isDark, accent)}</p>
        </div>
      )

    case "stats":
      return (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "1.8em 0" }}>
          {block.items.map((item, i) => (
            <div key={i} style={{
              flex: "1 1 140px",
              background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
              border: `1px solid ${borderClr}`, borderRadius: "8px",
              padding: "14px 16px",
            }}>
              <div style={{ fontFamily: fonts.heading, fontSize: "1.6rem",
                color: accent, lineHeight: 1, marginBottom: "4px",
                overflowWrap: "anywhere" }}>{item.num}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px",
                letterSpacing: "0.08em", textTransform: "uppercase", color: muted }}>{item.label}</div>
              {item.sub && <div style={{ fontSize: "11px", color: muted, marginTop: "4px" }}>{item.sub}</div>}
            </div>
          ))}
        </div>
      )

    case "image":
      return (
        <figure style={{ margin: "1.8em 0" }}>
          <img src={block.src} alt={block.alt} style={{
            display: "block", width: "100%", borderRadius: "8px",
            border: `1px solid ${borderClr}`,
          }} />
          {block.caption && (
            <figcaption style={{ fontSize: "11px", color: muted, marginTop: "8px",
              fontFamily: "'DM Mono', monospace" }}>{block.caption}</figcaption>
          )}
        </figure>
      )

    default:
      return null
  }
}

// ─── Dark-mode starfield background (kept — matches the 3D-universe aesthetic) ─
function NightSky() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      background: "#05050f",
      backgroundImage: `
        radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 100%),
        radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.12) 0%, transparent 100%),
        radial-gradient(1px 1px at 45% 70%, rgba(255,255,255,0.10) 0%, transparent 100%),
        radial-gradient(1px 1px at 65% 50%, rgba(255,255,255,0.08) 0%, transparent 100%),
        radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.10) 0%, transparent 100%),
        radial-gradient(1px 1px at 90% 60%, rgba(255,255,255,0.09) 0%, transparent 100%),
        radial-gradient(1px 1px at 35% 15%, rgba(255,255,255,0.11) 0%, transparent 100%),
        radial-gradient(1px 1px at 55% 90%, rgba(255,255,255,0.08) 0%, transparent 100%),
        radial-gradient(1px 1px at 75% 35%, rgba(255,255,255,0.10) 0%, transparent 100%),
        radial-gradient(1px 1px at 25% 55%, rgba(255,255,255,0.09) 0%, transparent 100%)
      `,
    }} />
  )
}

// ─── Main Reader ──────────────────────────────────────────────────────────────
export function Reader({ nodeId, onClose, backLabel = "Universe" }) {
  const article = ACTIVE_ARTICLES[nodeId]
  const [settings, setSettings] = useState({ theme: "dark", font: "sans", size: "sm" })
  const [gearOpen, setGearOpen] = useState(false)

  const isDark = settings.theme === "dark"
  const p = isDark ? PALETTE.dark : PALETTE.light

  const FONTS = {
    sans:  { body: "'Noto Sans', sans-serif",     heading: "'Noto Sans', sans-serif" },
    mono:  { body: "'DM Mono', monospace",       heading: "'DM Mono', monospace" },
    serif: { body: "Georgia, 'Times New Roman', serif", heading: "Georgia, serif" },
  }
  const SIZES = {
    sm: { body: "13px", h2: "18px", h3: "15px" },
    md: { body: "15px", h2: "21px", h3: "17px" },
    lg: { body: "17px", h2: "24px", h3: "19px" },
  }

  const fonts = FONTS[settings.font]
  const sizes = SIZES[settings.size]

  if (!article) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: p.bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Mono', monospace", color: p.muted, fontSize: "13px",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🛸</div>
          <div>Article content not yet loaded.</div>
          <button onClick={onClose} style={{
            marginTop: "16px", background: "none",
            border: `1px solid ${p.muted}44`, borderRadius: "6px",
            padding: "8px 16px", color: p.muted,
            fontFamily: "inherit", fontSize: "11px", cursor: "pointer",
          }}>← {backLabel}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: p.bg }}>
      <ProgressBar accent={p.accent} />
      <SparkleStyle accent={p.accent} />
      {isDark && <NightSky />}

      <NavBar
        backLabel={backLabel}
        onClose={onClose}
        isDark={isDark}
        onToggleTheme={() => setSettings(s => ({ ...s, theme: isDark ? "light" : "dark" }))}
        gearOpen={gearOpen}
        onToggleGear={() => setGearOpen(g => !g)}
      />
      <AnimatePresence>
        {gearOpen && <SettingsMenu settings={settings} onChange={setSettings} isDark={isDark} />}
      </AnimatePresence>

      {/* Scrollable content */}
      <div id="reader-scroll" style={{
        position: "relative", zIndex: 1,
        height: "100vh", overflowY: "auto",
        paddingTop: `${NAV_HEIGHT}px`,
        scrollbarWidth: "thin",
        scrollbarColor: isDark ? "#1e293b transparent" : "#e2e8f0 transparent",
      }}>
        {/* Full-bleed hero — only when the article has one; everything else is unaffected */}
        {article.heroImage && (
          <div style={{ position: "relative", width: "100%", height: "440px", overflow: "hidden" }}>
            <img src={article.heroImage.src} alt={article.heroImage.alt} style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: isDark ? 0.4 : 0.28,
            }} />
            {/* Text zone (roughly the bottom half) is pushed to fully solid
                background well before the title/dek/byline start, instead of
                fading out gradually behind them — readability regardless of
                what's in that part of the image. */}
            <div style={{
              position: "absolute", inset: 0,
              background: isDark
                ? `linear-gradient(to bottom, transparent 0%, rgba(5,5,15,0.55) 32%, ${p.bg} 62%)`
                : `linear-gradient(to bottom, transparent 0%, rgba(250,246,238,0.7) 32%, ${p.bg} 62%)`,
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              maxWidth: "680px", margin: "0 auto", padding: "0 32px 36px",
              textShadow: isDark ? "0 2px 16px rgba(0,0,0,0.9)" : "0 2px 16px rgba(255,255,255,0.9)",
            }}>
              {article.kicker && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px",
                  fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.14em",
                  textTransform: "uppercase", color: p.accent, marginBottom: "14px" }}>
                  {article.kicker.join(" · ")}
                </div>
              )}
              <h1 style={{
                fontFamily: fonts.heading,
                fontSize: settings.size === "lg" ? "32px" : settings.size === "sm" ? "24px" : "28px",
                fontWeight: 600, color: p.text, lineHeight: 1.25, margin: 0,
              }}>{article.title}</h1>
              {article.dek && (
                <p style={{ fontSize: "13px", color: p.muted, marginTop: "10px",
                  maxWidth: "480px", lineHeight: 1.6 }}>{article.dek}</p>
              )}
              <div style={{ marginTop: "16px" }}>
                <Byline article={article} isDark={isDark} accent={p.accent} />
              </div>
            </div>
          </div>
        )}

        <div style={{
          maxWidth: "680px", margin: "0 auto",
          padding: article.heroImage ? "24px 32px 120px" : "80px 32px 120px",
          // Prototype contrast scrim behind the article body in dark mode —
          // flagged non-final; the starfield otherwise sits directly behind
          // body text with no card to separate them. Revisit alongside the
          // deferred dark-mode background animation work.
          // No backdrop-filter here on purpose: it creates a new CSS
          // containing block for any `position: fixed` descendant (e.g. the
          // feedback modal, rendered inside this container via ActionRow),
          // which broke the modal's full-viewport overlay in dark mode —
          // it was containing itself to this 680px column instead of the
          // screen. A plain solid tint avoids that entirely.
          ...(isDark ? {
            background: "rgba(5,5,15,0.72)",
            borderRadius: "24px",
          } : {}),
        }}>
          {!article.heroImage && (
            <div style={{ marginBottom: "8px" }}>
              <h1 style={{
                fontFamily: fonts.heading,
                fontSize: settings.size === "lg" ? "32px" : settings.size === "sm" ? "24px" : "28px",
                fontWeight: 600, color: p.text, lineHeight: 1.25,
                margin: "0 0 18px",
              }}>{article.title}</h1>
              <Byline article={article} isDark={isDark} accent={p.accent} />
            </div>
          )}

          <ActionRow isDark={isDark} articleTitle={article.title} />

          {/* Article body */}
          {article.blocks.map((block, i) => (
            <Block key={i} block={block} fonts={fonts} sizes={sizes} isDark={isDark} accent={p.accent} />
          ))}

          <ActionRow isDark={isDark} articleTitle={article.title} />

          {/* Colophon — quiet provenance note, sits at the very end of the
              article rather than floating fixed over the content. */}
          {article.colophon && (
            <div style={{
              marginTop: "8px", paddingTop: "18px",
              borderTop: `1px solid ${p.border}`,
              fontFamily: "'DM Mono', monospace", fontSize: "10px",
              letterSpacing: "0.04em", lineHeight: 1.6,
              color: p.muted, opacity: 0.85,
            }}>{article.colophon}</div>
          )}
        </div>
      </div>
    </div>
  )
}

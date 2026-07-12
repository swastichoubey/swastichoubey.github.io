import { useState, useEffect, useRef } from "react"
import { motion } from "motion/react"
import { THEME, TYPE_LABELS } from "./theme"
import { ARTICLES } from "./readerContent"
import { glassPanel, glassPanelLight, glassDock, SPRING, EASE_OUT } from "./glass"

// ─── Reading progress bar ─────────────────────────────────────────────────────
function ProgressBar({ color }) {
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
      position: "fixed", top: 0, left: 0, right: 0,
      height: "2px", zIndex: 200, background: "transparent",
    }}>
      <div style={{
        height: "100%", width: `${progress}%`,
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        boxShadow: `0 0 8px ${color}88`,
        transition: "width 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
      }} />
    </div>
  )
}

// ─── Controls panel ───────────────────────────────────────────────────────────
function Controls({ settings, onChange, onClose, hidden, onToggleHide, isDark }) {
  if (hidden) {
    return (
      <motion.button
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={SPRING.panel}
        onClick={onToggleHide}
        style={{
          position: "fixed", top: "50%", right: 0,
          translateY: "-50%",
          ...glassDock(isDark),
          color: isDark ? "#94a3b8" : "#64748b",
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px", letterSpacing: "0.1em",
          padding: "16px 5px", cursor: "pointer",
          zIndex: 150, writingMode: "vertical-rl",
        }}
      >
        ⚙ controls
      </motion.button>
    )
  }

  const labelClr  = isDark ? "#64748b"               : "#94a3b8"
  const textClr   = isDark ? "#f1f5f9"               : "#1e293b"
  const panelBdr  = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)"

  const BtnRow = ({ label, options, value, setter }) => (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "8px", color: labelClr, letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", gap: "4px" }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => setter(opt.value)} style={{
            flex: 1, padding: "5px 0",
            borderRadius: "5px",
            border: `1px solid ${value === opt.value ? "#a78bfa55" : panelBdr}`,
            background: value === opt.value
              ? "linear-gradient(135deg, #a78bfa30 0%, #a78bfa14 100%)"
              : "transparent",
            boxShadow: value === opt.value ? "inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
            color: value === opt.value ? "#a78bfa" : labelClr,
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
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={SPRING.panel}
      style={{
        position: "fixed", top: "50%", right: "20px",
        translateY: "-50%",
        width: "180px",
        ...(isDark ? glassPanel("#a78bfa") : glassPanelLight()),
        borderRadius: "16px", padding: "16px",
        fontFamily: "'DM Mono', monospace",
        zIndex: 150, color: textClr,
      }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "8px", color: labelClr, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Reader
        </span>
        <button onClick={onToggleHide} style={{
          marginLeft: "auto", background: "none", border: "none",
          color: labelClr, cursor: "pointer", fontSize: "12px", padding: "2px",
        }}>–</button>
        <button onClick={onClose} style={{
          background: "none", border: "none", marginLeft: "4px",
          color: labelClr, cursor: "pointer", fontSize: "13px", padding: "2px",
        }}>✕</button>
      </div>

      <BtnRow label="Theme" options={[{ label: "Dark", value: "dark" }, { label: "Light", value: "light" }]}
        value={settings.theme} setter={v => onChange({ ...settings, theme: v })} />
      <BtnRow label="Font" options={[{ label: "Mono", value: "mono" }, { label: "Serif", value: "serif" }]}
        value={settings.font} setter={v => onChange({ ...settings, font: v })} />
      <BtnRow label="Size" options={[
          { label: "S", value: "sm" },
          { label: "M", value: "md" },
          { label: "L", value: "lg" },
        ]}
        value={settings.size} setter={v => onChange({ ...settings, size: v })} />
    </motion.div>
  )
}

// ─── Content block renderer ───────────────────────────────────────────────────
function Block({ block, fonts, sizes, isDark }) {
  const prose = isDark ? "#cbd5e1" : "#334155"
  const head  = isDark ? "#f8fafc" : "#0f172a"
  const muted = isDark ? "#475569" : "#94a3b8"
  const quoteBg  = isDark ? "#0f172a" : "#f8fafc"
  const quoteBdr = isDark ? "#1e293b" : "#e2e8f0"
  const codeBg   = isDark ? "#080c14" : "#f1f5f9"

  switch (block.type) {
    case "heading":
      return <h2 style={{ fontFamily: fonts.heading, fontSize: sizes.h2,
        color: head, fontWeight: 600, margin: "2em 0 0.6em", lineHeight: 1.3 }}>{block.text}</h2>

    case "subheading":
      return <h3 style={{ fontFamily: fonts.body, fontSize: sizes.h3,
        color: head, fontWeight: 500, margin: "1.6em 0 0.5em", lineHeight: 1.4 }}>{block.text}</h3>

    case "paragraph":
      return <p style={{ fontFamily: fonts.body, fontSize: sizes.body,
        color: prose, lineHeight: 1.85, margin: "0 0 1.2em" }}>{block.text}</p>

    case "quote":
      return (
        <blockquote style={{
          margin: "1.8em 0", padding: "14px 20px",
          background: quoteBg, borderLeft: `3px solid #a78bfa`,
          borderRadius: "0 8px 8px 0",
        }}>
          <p style={{ fontFamily: fonts.body, fontSize: sizes.body,
            color: isDark ? "#a78bfa" : "#7c3aed", lineHeight: 1.75,
            margin: 0, fontStyle: "italic" }}>{block.text}</p>
        </blockquote>
      )

    case "code":
      return (
        <pre style={{
          background: codeBg, borderRadius: "8px",
          padding: "16px", margin: "1.4em 0",
          overflowX: "auto",
          border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
        }}>
          <code style={{
            fontFamily: "'DM Mono', monospace", fontSize: "12px",
            color: isDark ? "#7dd3fc" : "#0369a1", lineHeight: 1.7,
          }}>{block.text}</code>
        </pre>
      )

    case "divider":
      return <hr style={{ border: "none",
        borderTop: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
        margin: "2.5em 0" }} />
    
    case "table":
  return (
    <div style={{
      overflowX: "auto", margin: "1.6em 0",
      border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: "6px",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse",
        fontFamily: "'DM Mono', monospace", fontSize: "12px" }}>
        {block.headers && (
          <thead>
            <tr style={{ background: isDark ? "#080c14" : "#f8fafc",
              borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` }}>
              {block.headers.map((h, i) => (
                <th key={i} style={{ padding: "9px 14px", textAlign: "left",
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontWeight: 500, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                  {h}
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
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
    
    default:
      return null
  }
}

// ─── Sky backgrounds ──────────────────────────────────────────────────────────
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

function DaySky() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      background: "linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 40%, #f8fafc 100%)",
    }}>
      {/* Sun glow */}
      <div style={{
        position: "absolute", top: "8%", right: "12%",
        width: "120px", height: "120px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(253,224,71,0.25) 0%, transparent 70%)",
      }} />
    </div>
  )
}

// ─── Main Reader ──────────────────────────────────────────────────────────────
export function Reader({ nodeId, onClose }) {
  const article = ARTICLES[nodeId]
  const [settings,      setSettings]      = useState({ theme: "dark", font: "mono", size: "md" })
  const [controlsHidden, setControlsHidden] = useState(false)

  const isDark = settings.theme === "dark"

  const FONTS = {
    mono:  { body: "'DM Mono', monospace",       heading: "'DM Mono', monospace" },
    serif: { body: "Georgia, 'Times New Roman', serif", heading: "Georgia, serif" },
  }
  const SIZES = {
    sm: { body: "13px", h2: "18px", h3: "15px" },
    md: { body: "15px", h2: "21px", h3: "17px" },
    lg: { body: "17px", h2: "24px", h3: "19px" },
  }

  const fonts  = FONTS[settings.font]
  const sizes  = SIZES[settings.size]
  const color  = THEME[article?.type] || THEME.about

  const bgColor   = isDark ? "#05050f"  : "#ffffff"
  const textColor = isDark ? "#f1f5f9"  : "#0f172a"
  const mutedClr  = isDark ? "#475569"  : "#94a3b8"

  if (!article) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: bgColor, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Mono', monospace", color: mutedClr, fontSize: "13px",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🛸</div>
          <div>Article content not yet loaded.</div>
          <button onClick={onClose} style={{
            marginTop: "16px", background: "none",
            border: `1px solid ${mutedClr}44`, borderRadius: "6px",
            padding: "8px 16px", color: mutedClr,
            fontFamily: "inherit", fontSize: "11px", cursor: "pointer",
          }}>← Back to Universe</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: bgColor }}>
      <ProgressBar color={color} />
      {isDark ? <NightSky /> : <DaySky />}

      {/* Back button — liquid glass chrome */}
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={SPRING.snappy}
        onClick={onClose}
        style={{
          position: "fixed", top: "20px", left: "24px",
          ...(isDark ? glassPanel("#a78bfa") : glassPanelLight()),
          borderRadius: "10px", padding: "7px 14px",
          color: isDark ? "#94a3b8" : "#64748b",
          fontFamily: "'DM Mono', monospace", fontSize: "10px",
          letterSpacing: "0.08em", cursor: "pointer", zIndex: 160,
        }}
      >← Universe</motion.button>

      {/* Scrollable content */}
      <div id="reader-scroll" style={{
        position: "relative", zIndex: 1,
        height: "100vh", overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: isDark ? "#1e293b transparent" : "#e2e8f0 transparent",
      }}>
        <div style={{
          maxWidth: "680px", margin: "0 auto",
          padding: "80px 32px 120px",
        }}>
          {/* Article header */}
          <div style={{ marginBottom: "48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: color, boxShadow: `0 0 6px ${color}`,
              }} />
              <span style={{ fontSize: "9px", color: mutedClr,
                letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {TYPE_LABELS[article.type]}
              </span>
              <span style={{ fontSize: "9px", color: mutedClr }}>·</span>
              <span style={{ fontSize: "9px", color: mutedClr }}>{article.date}</span>
              <span style={{ fontSize: "9px", color: mutedClr }}>·</span>
              <span style={{ fontSize: "9px", color: mutedClr }}>{article.readTime} min read</span>
            </div>

            <h1 style={{
              fontFamily: fonts.heading,
              fontSize: settings.size === "lg" ? "32px" : settings.size === "sm" ? "24px" : "28px",
              fontWeight: 600, color: textColor, lineHeight: 1.25,
              margin: 0,
            }}>
              {article.title}
            </h1>
          </div>

          {/* Article body */}
          {article.blocks.map((block, i) => (
            <Block key={i} block={block} fonts={fonts} sizes={sizes} isDark={isDark} />
          ))}
        </div>
      </div>

      <Controls
        settings={settings}
        onChange={setSettings}
        onClose={onClose}
        hidden={controlsHidden}
        onToggleHide={() => setControlsHidden(p => !p)}
        isDark={isDark}
      />

    </div>
  )
}

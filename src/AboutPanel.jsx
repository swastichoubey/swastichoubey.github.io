import { useState, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ABOUT, EXPERIENCE, EDUCATION, WORK, SOCIALS } from "./AboutData"
import { glassPanel, glassCard, glassCardHover, SPRING, EASE_OUT } from "./glass"
import emailjs from "@emailjs/browser"

// Dark-only teal accent, shared with the Reader's unified accent system.
// This panel never renders on a light surface (the grid page and 3D
// universe have no light/dark toggle — only the Reader does), so there's
// just the one value, not a light/dark pair.
export const ABOUT_ACCENT = "#008B8B"
const color = ABOUT_ACCENT

const FONT_CONTENT = "'Noto Sans', sans-serif"  // headings + prose
const FONT_CHROME   = "'DM Mono', monospace"     // labels, meta, form fields

// ─── Brand icons — plain inline SVGs, no icon library needed ──────────────────
const BRAND_PATHS = {
  GitHub: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  LinkedIn: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  Substack: "M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.539 24V10.812H1.46zM22.539 0H1.46v2.836h21.08V0z",
  X: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
}

export function BrandIcon({ name, size = 15 }) {
  const d = BRAND_PATHS[name]
  if (!d) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

// ─── Sub-panel views ──────────────────────────────────────────────────────────
// AboutView/ExperienceView/EducationView/ContactView/Tab/BrandIcon are
// exported so the grid-view AboutCard can reuse the exact same content and
// styling instead of re-implementing it.
export function AboutView() {
  return (
    <>
      <h2 style={{ fontFamily: FONT_CONTENT, fontSize: "18px", fontWeight: 700, color: "#f8fafc", marginBottom: "12px" }}>
        {ABOUT.name}
      </h2>
      {/* Pull-quote — same visual treatment as the Reader's blockquote block */}
      <blockquote style={{
        margin: "0 0 16px", padding: "10px 16px",
        borderLeft: `3px solid ${color}`,
        background: `${color}0d`, borderRadius: "0 6px 6px 0",
      }}>
        <p style={{ fontFamily: FONT_CONTENT, fontSize: "13px", color, lineHeight: 1.6,
          margin: 0, fontStyle: "italic" }}>
          {ABOUT.tagline}
        </p>
      </blockquote>
      {ABOUT.bio.map((para, i) => (
        <p key={i} style={{ fontFamily: FONT_CONTENT, fontSize: "12.5px", color: "#a5b4cb",
          lineHeight: 1.8, marginBottom: "12px" }}>
          {para}
        </p>
      ))}
    </>
  )
}

export function ExperienceView() {
  return (
    <>
      {EXPERIENCE.map((job, i) => (
        <div key={i} style={{ marginBottom: "20px" }}>
          <div style={{ fontFamily: FONT_CONTENT, fontSize: "13px", fontWeight: 600, color: "#f8fafc", marginBottom: "2px" }}>
            {job.role}
          </div>
          <div style={{ fontFamily: FONT_CHROME, fontSize: "10px", color, marginBottom: "1px" }}>{job.org}</div>
          <div style={{ fontFamily: FONT_CHROME, fontSize: "9px", color: "#64748b", marginBottom: "10px" }}>
            {job.period} · {job.location}
          </div>
          {job.highlights.map((h, j) => (
            <div key={j} style={{
              fontFamily: FONT_CONTENT, fontSize: "11px", color: "#94a3b8", padding: "4px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", gap: "7px", lineHeight: 1.6,
            }}>
              <span style={{ color: "#475569", flexShrink: 0 }}>–</span>
              {h}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

export function EducationView() {
  return (
    <>
      {EDUCATION.map((edu, i) => (
        <div key={i} style={{
          marginBottom: "14px", padding: "10px 12px",
          ...glassCard(color),
        }}>
          <div style={{ fontFamily: FONT_CONTENT, fontSize: "13px", fontWeight: 600, color: "#f8fafc", marginBottom: "2px" }}>
            {edu.degree}
          </div>
          <div style={{ fontFamily: FONT_CHROME, fontSize: "10px", color, marginBottom: "2px" }}>{edu.institution}</div>
          <div style={{ fontFamily: FONT_CHROME, fontSize: "9px", color: "#64748b", marginBottom: "4px" }}>{edu.period}</div>
          {edu.notes && (
            <div style={{ fontFamily: FONT_CONTENT, fontSize: "10.5px", color: "#7c8aa5", lineHeight: 1.6 }}>{edu.notes}</div>
          )}
        </div>
      ))}
    </>
  )
}

function WorkView() {
  return (
    <>
      {WORK.map((item, i) => (
        <div key={i} style={{
          marginBottom: "10px", padding: "10px 12px",
          ...glassCard(color),
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
            <span style={{
              fontFamily: FONT_CHROME, fontSize: "8px", padding: "1px 6px", borderRadius: "3px",
              background: `${color}14`, border: `1px solid ${color}22`, color,
              letterSpacing: "0.06em",
            }}>{item.type}</span>
          </div>
          <div style={{ fontFamily: FONT_CONTENT, fontSize: "13px", fontWeight: 600, color: "#f8fafc", marginBottom: "4px" }}>
            {item.title}
          </div>
          <div style={{ fontFamily: FONT_CONTENT, fontSize: "11px", color: "#94a3b8", lineHeight: 1.7 }}>{item.desc}</div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: FONT_CHROME, fontSize: "9px", color, textDecoration: "none", marginTop: "6px", display: "block" }}>
              View ↗
            </a>
          )}
        </div>
      ))}
    </>
  )
}

function SocialsView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {SOCIALS.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 12px",
          ...glassCard(color),
          textDecoration: "none", transition: `all 0.3s ${EASE_OUT}`,
        }}
          onMouseEnter={e => Object.assign(e.currentTarget.style, glassCardHover(color))}
          onMouseLeave={e => Object.assign(e.currentTarget.style, glassCard(color))}
        >
          <span style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: `${color}14`, border: `1px solid ${color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color, flexShrink: 0,
          }}><BrandIcon name={s.label} /></span>
          <div>
            <div style={{ fontFamily: FONT_CONTENT, fontSize: "11px", color: "#e2e8f0", fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontFamily: FONT_CHROME, fontSize: "9px", color: "#64748b" }}>{s.handle}</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#475569" }}>↗</span>
        </a>
      ))}
      {/* Resume — the floating panel has no persistent footer to put this in
          (unlike the grid-view AboutCard), so it lives here instead now that
          it's no longer inline in the About Me tab. */}
      <a href={ABOUT.resumeUrl} target="_blank" rel="noopener noreferrer" style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 12px",
        ...glassCard(color),
        textDecoration: "none", transition: `all 0.3s ${EASE_OUT}`,
      }}
        onMouseEnter={e => Object.assign(e.currentTarget.style, glassCardHover(color))}
        onMouseLeave={e => Object.assign(e.currentTarget.style, glassCard(color))}
      >
        <span style={{
          width: "28px", height: "28px", borderRadius: "6px",
          background: `${color}14`, border: `1px solid ${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONT_CHROME, fontSize: "9px", color, fontWeight: 600, flexShrink: 0,
        }}>CV</span>
        <div style={{ fontFamily: FONT_CONTENT, fontSize: "11px", color: "#e2e8f0", fontWeight: 500 }}>Resume</div>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "#475569" }}>↗</span>
      </a>
    </div>
  )
}

export function ContactView() {
  const formRef = useRef()
  const [status, setStatus] = useState(null)

  const sendEmail = async e => {
    e.preventDefault()
    setStatus("sending")
    try {
      await emailjs.sendForm(
        'service_y8v13ae',
        'template_ua3u0km',
        formRef.current,
        'lc5LMt9P3CWcP9Zei'
      )
      setStatus("sent")
      formRef.current.reset()
    } catch {
      setStatus("error")
    }
  }

  if (status === "sent") {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: "20px", marginBottom: "10px" }}>✓</div>
        <div style={{ fontFamily: FONT_CHROME, fontSize: "11px", color: "#94a3b8" }}>
          Message sent. I'll get back to you.
        </div>
      </div>
    )
  }

  const inputStyle = {
    width: "100%", background: "#080812",
    border: "1px solid #1e293b", borderRadius: "6px",
    padding: "8px 10px", color: "#f1f5f9",
    fontSize: "11px", fontFamily: FONT_CHROME,
    outline: "none", marginBottom: "8px", boxSizing: "border-box",
  }

  const focusStyle = col => e => e.target.style.borderColor = col + "55"
  const blurStyle  = e => e.target.style.borderColor = "#1e293b"

  return (
    // Centered rather than flush-left — matters most in the wide grid-view
    // card, harmless in the already-narrow floating panel.
    <form ref={formRef} onSubmit={sendEmail} style={{ overflow: "visible", maxWidth: "360px", margin: "0 auto" }}>
      <input
        type="text" name="name" placeholder="Name" required
        style={inputStyle}
        onFocus={focusStyle(color)} onBlur={blurStyle}
      />
      <input
        type="email" name="email" placeholder="Email" required
        style={inputStyle}
        onFocus={focusStyle(color)} onBlur={blurStyle}
      />
      <textarea
        name="message" placeholder="Message" rows={4} required
        style={{ ...inputStyle, resize: "vertical", marginBottom: "10px" }}
        onFocus={focusStyle(color)} onBlur={blurStyle}
      />
      {/* Sized to its content, not the full form width */}
      <button
        type="submit" onClick={sendEmail} disabled={status === "sending"}
        style={{
          display: "block", margin: "0 auto",
          padding: "8px 20px", borderRadius: "8px",
          background: `${color}14`, border: `1px solid ${color}55`,
          color, fontFamily: FONT_CHROME, fontSize: "10px", letterSpacing: "0.05em",
          cursor: "pointer", opacity: status === "sending" ? 0.6 : 1,
          transition: `all 0.25s ${EASE_OUT}`,
        }}
        onMouseEnter={e => { if (status !== "sending") e.currentTarget.style.background = `${color}26` }}
        onMouseLeave={e => { e.currentTarget.style.background = `${color}14` }}
      >
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>
      {status === "error" && (
        <div style={{ fontFamily: FONT_CHROME, fontSize: "9px", color: "#ef4444", marginTop: "8px", textAlign: "center" }}>
          Something went wrong. Email me directly at swastichoubey83@gmail.com
        </div>
      )}
    </form>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────
const VIEWS = {
  about:      { tab: "About",      title: "About Me",   component: AboutView      },
  experience: { tab: "Experience", title: "Experience", component: ExperienceView },
  education:  { tab: "Education",  title: "Education",  component: EducationView  },
  work:       { tab: "Work",       title: "Work",       component: WorkView       },
  socials:    { tab: "Socials",    title: "Socials",    component: SocialsView    },
  contact:    { tab: "Contact",    title: "Contact",    component: ContactView    },
}

// Freestanding bordered pill, not wrapped in a shared enclosing shape —
// each tab carries its own active/inactive state independently.
export function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: "20px",
        border: `1px solid ${active ? color : "rgba(255,255,255,0.12)"}`,
        background: active ? `${color}14` : "transparent",
        color: active ? color : "#94a3b8",
        fontFamily: FONT_CHROME, fontSize: "10px",
        letterSpacing: "0.06em", cursor: "pointer",
        transition: `all 0.25s ${EASE_OUT}`,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#e2e8f0" }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#94a3b8" }}
    >{label}</button>
  )
}

export function AboutPanel({ view = "about", onViewChange, onClose }) {
  const activeKey = VIEWS[view] ? view : "about"
  const View = VIEWS[activeKey].component

  return (
    <motion.div
      initial={{ opacity: 0, x: 28, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={SPRING.panel}
      style={{
        position: "fixed",
        top: "50%", right: "24px",
        translateY: "-50%",
        width: "320px",
        maxHeight: "82vh",
        display: "flex", flexDirection: "column",
        ...glassPanel(color),
        padding: "20px",
        color: "#f1f5f9",
        fontFamily: FONT_CHROME,
        zIndex: 60,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "9px", color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {VIEWS[activeKey].title}
        </span>
        <button onClick={onClose} style={{
          marginLeft: "auto", background: "none", border: "none",
          color: "#64748b", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px",
        }}>✕</button>
      </div>

      {/* Tab row — freestanding pills, centered, no enclosing container */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center",
        marginBottom: "14px",
      }}>
        {Object.entries(VIEWS).map(([key, val]) => (
          <Tab
            key={key}
            label={val.tab}
            active={key === activeKey}
            onClick={() => onViewChange(key)}
          />
        ))}
      </div>

      {/* Animated content */}
      <div style={{
        overflowY: "auto",
        overflowX: "auto",
        scrollbarWidth: "none",
        flex: 1,
        minHeight: 0,
        padding: "12px",
        margin: "-12px",
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: "easeIn" } }}
            transition={SPRING.soft}
          >
            <View />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

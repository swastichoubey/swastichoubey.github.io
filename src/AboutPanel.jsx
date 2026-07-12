import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ABOUT, EXPERIENCE, EDUCATION, WORK, SOCIALS } from "./AboutData"
import { THEME } from "./theme"
import { glassPanel, glassCard, glassCardHover, SPRING, EASE_OUT } from "./glass"
import { useRef } from "react"
import emailjs from "@emailjs/browser"
import { SparkleButton } from "./SparkleButton"

const color = THEME.about

// ─── Sub-panel views ──────────────────────────────────────────────────────────
function AboutView() {
  return (
    <>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f8fafc", marginBottom: "4px" }}>
        {ABOUT.name}
      </h2>
      <p style={{ fontSize: "11px", color: color, marginBottom: "14px", lineHeight: 1.5 }}>
        {ABOUT.tagline}
      </p>
      {ABOUT.bio.map((para, i) => (
        <p key={i} style={{ fontSize: "11px", color: "#a5b4cb", lineHeight: 1.75, marginBottom: "10px" }}>
          {para}
        </p>
      ))}
      <div style={{ marginTop: "18px", overflow: "visible" }}>
        <SparkleButton
          href={ABOUT.resumeUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
        >
          ↓ Download CV
        </SparkleButton>
      </div>
    </>
  )
}

function ExperienceView() {
  return (
    <>
      {EXPERIENCE.map((job, i) => (
        <div key={i} style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#f8fafc", marginBottom: "2px" }}>
            {job.role}
          </div>
          <div style={{ fontSize: "10px", color: color, marginBottom: "1px" }}>{job.org}</div>
          <div style={{ fontSize: "9px", color: "#64748b", marginBottom: "10px" }}>
            {job.period} · {job.location}
          </div>
          {job.highlights.map((h, j) => (
            <div key={j} style={{
              fontSize: "10px", color: "#94a3b8", padding: "3px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", gap: "7px",
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

function EducationView() {
  return (
    <>
      {EDUCATION.map((edu, i) => (
        <div key={i} style={{
          marginBottom: "14px", padding: "10px 12px",
          ...glassCard(color),
        }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#f8fafc", marginBottom: "2px" }}>
            {edu.degree}
          </div>
          <div style={{ fontSize: "10px", color: color, marginBottom: "2px" }}>{edu.institution}</div>
          <div style={{ fontSize: "9px", color: "#64748b", marginBottom: "4px" }}>{edu.period}</div>
          {edu.notes && (
            <div style={{ fontSize: "9px", color: "#7c8aa5" }}>{edu.notes}</div>
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
              fontSize: "8px", padding: "1px 6px", borderRadius: "3px",
              background: `${color}14`, border: `1px solid ${color}22`, color,
              letterSpacing: "0.06em",
            }}>{item.type}</span>
          </div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#f8fafc", marginBottom: "4px" }}>
            {item.title}
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", lineHeight: 1.6 }}>{item.desc}</div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "9px", color, textDecoration: "none", marginTop: "6px", display: "block" }}>
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
            fontSize: "9px", color, fontWeight: 600, flexShrink: 0,
          }}>{s.icon}</span>
          <div>
            <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>{s.handle}</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#475569" }}>↗</span>
        </a>
      ))}
    </div>
  )
}

function ContactView() {
  const c = THEME.about
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
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
          Message sent. I'll get back to you.
        </div>
      </div>
    )
  }

  const inputStyle = {
    width: "100%", background: "#080812",
    border: "1px solid #1e293b", borderRadius: "6px",
    padding: "8px 10px", color: "#f1f5f9",
    fontSize: "11px", fontFamily: "'DM Mono', monospace",
    outline: "none", marginBottom: "8px", boxSizing: "border-box",
  }

  const focusStyle = col => e => e.target.style.borderColor = col + "55"
  const blurStyle  = e => e.target.style.borderColor = "#1e293b"

  return (
    <form ref={formRef} onSubmit={sendEmail} style={{ overflow: "visible" }}>
      <input
        type="text" name="name" placeholder="Name" required
        style={inputStyle}
        onFocus={focusStyle(c)} onBlur={blurStyle}
      />
      <input
        type="email" name="email" placeholder="Email" required
        style={inputStyle}
        onFocus={focusStyle(c)} onBlur={blurStyle}
      />
      <textarea
        name="message" placeholder="Message" rows={4} required
        style={{ ...inputStyle, resize: "vertical", marginBottom: "10px" }}
        onFocus={focusStyle(c)} onBlur={blurStyle}
      />
      <div style={{ overflow: "visible" }}>
        <SparkleButton
          onClick={sendEmail}
          style={{ opacity: status === "sending" ? 0.5 : 1 }}
        >
          {status === "sending" ? "Sending…" : "Send Message"}
        </SparkleButton>
      </div>
      {status === "error" && (
        <div style={{ fontSize: "9px", color: "#ef4444", marginTop: "6px", textAlign: "center" }}>
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

function Tab({ viewKey, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        padding: "5px 11px", borderRadius: "20px",
        border: "1px solid transparent",
        background: "transparent",
        color: active ? "#0b0d1c" : "#94a3b8",
        fontSize: "9.5px", fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.07em", cursor: "pointer",
        transition: `color 0.25s ${EASE_OUT}`,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#e2e8f0" }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#94a3b8" }}
    >
      {active && (
        <motion.span
          layoutId="about-tab-pill"
          transition={SPRING.snappy}
          style={{
            position: "absolute", inset: 0,
            borderRadius: "20px",
            background: `linear-gradient(135deg, ${color} 0%, #cbd5e1 100%)`,
            boxShadow: `0 2px 10px ${color}44, inset 0 1px 0 rgba(255,255,255,0.6)`,
            zIndex: 0,
          }}
        />
      )}
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </button>
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
        fontFamily: "'DM Mono', monospace",
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

      {/* Persistent tab bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "3px",
        padding: "5px",
        marginBottom: "14px",
        borderRadius: "24px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)",
      }}>
        {Object.entries(VIEWS).map(([key, val]) => (
          <Tab
            key={key}
            viewKey={key}
            label={val.tab}
            active={key === activeKey}
            onClick={() => onViewChange(key)}
          />
        ))}
      </div>

      {/* Animated content */}
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
import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ABOUT, SOCIALS } from "./AboutData"
import { glassPanel, EASE_OUT, SPRING } from "./glass"
import { AboutView, ExperienceView, EducationView, ContactView, Tab, BrandIcon, ABOUT_ACCENT } from "./AboutPanel"

const color = ABOUT_ACCENT

// Wide-format About Me card for the grid page — reuses the exact same tab
// content as the floating AboutPanel (3D universe view), just in a full-width
// card instead of a narrow fixed panel, with a persistent socials + resume
// footer instead of Work/Socials as their own tabs.
const TABS = {
  about:      { label: "About Me",   component: AboutView },
  education:  { label: "Education",  component: EducationView },
  experience: { label: "Experience", component: ExperienceView },
  contact:    { label: "Contact",    component: ContactView },
}

function SocialIcon({ s }) {
  return (
    <a
      href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
      style={{
        width: "34px", height: "34px", borderRadius: "8px",
        background: `${color}14`, border: `1px solid ${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color, textDecoration: "none",
        transition: `all 0.25s ${EASE_OUT}`, flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}26`; e.currentTarget.style.borderColor = `${color}55` }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.borderColor = `${color}22` }}
    ><BrandIcon name={s.label} /></a>
  )
}

export function AboutCard() {
  const [activeKey, setActiveKey] = useState("about")
  const View = TABS[activeKey].component

  return (
    <div style={{
      ...glassPanel(color),
      padding: "24px", marginBottom: "28px",
      color: "#f1f5f9", fontFamily: "'DM Mono', monospace",
    }}>
      {/* Tab row — freestanding pills, centered, no enclosing container */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center",
        marginBottom: "20px",
      }}>
        {Object.entries(TABS).map(([key, val]) => (
          <Tab key={key} label={val.label}
            active={key === activeKey} onClick={() => setActiveKey(key)} />
        ))}
      </div>

      {/* Content — constrained to Reader's own reading width and centered,
          rather than flush-left in the full-width card */}
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: "easeIn" } }}
            transition={SPRING.soft}
          >
            <View />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer — socials + resume, always visible regardless of active tab */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
        marginTop: "22px", paddingTop: "18px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {SOCIALS.map((s, i) => <SocialIcon key={i} s={s} />)}
        </div>
        <a
          href={ABOUT.resumeUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: "8px",
            background: `${color}14`, border: `1px solid ${color}33`,
            color, fontSize: "10px", fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.05em", textDecoration: "none", cursor: "pointer",
            transition: `all 0.25s ${EASE_OUT}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${color}26`; e.currentTarget.style.borderColor = `${color}66` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.borderColor = `${color}33` }}
        >Resume ↗</a>
      </div>
    </div>
  )
}

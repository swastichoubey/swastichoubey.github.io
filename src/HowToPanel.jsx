import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { THEME } from "./theme"
import { glassPanel, glassChip, SPRING } from "./glass"

const STEPS = [
  { icon: "▦", text: "Don't want to explore the planets? Click the grid icon, top right, for a flat list of every article." },
  { icon: "✋", text: "Drag to rotate, scroll to zoom. Click a node for details, click empty space to close it." },
  { icon: "◐", text: "Dot color marks the article type (see legend, top left). Dashed ring means draft." },
  { icon: "○", text: "Small moons around a node are references — click one for its source." },
  { icon: "↗", text: "Read Article opens the full piece in the details panel." },
  { icon: "◈", text: "Use Highlights to jump to picks, or filter by type and tag." },
  { icon: "◎", text: "Click the white planet for Swasti's bio." },
]

export function HowToPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING.snappy}
          onClick={() => setOpen(true)}
          title="How to navigate"
          style={{
            position: "fixed", top: "24px", right: "74px",
            ...glassChip("#a78bfa"),
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 12px", cursor: "pointer",
            color: "#a78bfa", fontFamily: "'DM Mono', monospace",
            fontSize: "9px", letterSpacing: "0.08em",
            zIndex: 55, userSelect: "none",
          }}
        >
          <span style={{ fontSize: "10px" }}>?</span> how to navigate
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98, transition: { duration: 0.16, ease: "easeIn" } }}
            transition={SPRING.panel}
            style={{
              position: "fixed", top: "24px", right: "24px",
              width: "270px", maxHeight: "46vh", overflowY: "auto",
              ...glassPanel("#a78bfa"),
              padding: "16px", fontFamily: "'DM Mono', monospace",
              zIndex: 65, scrollbarWidth: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "9px", color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                How to Navigate
              </span>
              <button onClick={() => setOpen(false)} title="Close" style={{
                marginLeft: "auto", background: "none", border: "none",
                color: "#64748b", cursor: "pointer", fontSize: "13px", padding: "2px",
              }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{
                    fontSize: "10px", color: THEME.exploratory, flexShrink: 0,
                    width: "14px", textAlign: "center", marginTop: "1px",
                  }}>{step.icon}</span>
                  <span style={{ fontSize: "10px", color: "#cbd5e1", lineHeight: 1.6, letterSpacing: "0.01em" }}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

import { motion } from "motion/react"
import { THEME } from "./theme"
import { glassChip, SPRING } from "./glass"
import { TOPBAR_TOP, TOPBAR_RIGHT, TOPBAR_GAP, TOPBAR_SIZE, TOPBAR_RADIUS } from "./chrome"

// Entry point to the About panel — third in the top-right row, left of the
// "?" and grid buttons. Replaces the white About planet.
export function AboutButton({ active, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING.snappy}
      onClick={onClick}
      aria-pressed={active}
      title="About Swasti"
      style={{
        position: "fixed", top: `${TOPBAR_TOP}px`,
        right: `${TOPBAR_RIGHT + 2 * (TOPBAR_SIZE + TOPBAR_GAP)}px`,
        ...glassChip(THEME.about, active),
        borderRadius: `${TOPBAR_RADIUS}px`,
        height: `${TOPBAR_SIZE}px`, padding: "0 14px",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        color: active ? "#f8fafc" : "#cbd5e1",
        fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.08em",
        zIndex: 55, userSelect: "none",
      }}
    >About Me</motion.button>
  )
}

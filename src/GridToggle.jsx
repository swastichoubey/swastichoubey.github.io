import { motion } from "motion/react"
import { glassChip, SPRING } from "./glass"
import { TOPBAR_TOP, TOPBAR_RIGHT, TOPBAR_SIZE, TOPBAR_RADIUS } from "./chrome"

export function GridToggle({ active, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING.snappy}
      onClick={onClick}
      title="Switch to grid view"
      style={{
        position: "fixed", top: `${TOPBAR_TOP}px`, right: `${TOPBAR_RIGHT}px`,
        ...glassChip("#a78bfa", active),
        borderRadius: `${TOPBAR_RADIUS}px`,
        width: `${TOPBAR_SIZE}px`, height: `${TOPBAR_SIZE}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        color: active ? "#a78bfa" : "#94a3b8",
        fontSize: active ? "17px" : "18px",
        zIndex: 56, userSelect: "none",
      }}
    >{active ? "🪐" : "▦"}</motion.button>
  )
}

import { motion } from "motion/react"
import { glassChip, SPRING } from "./glass"

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
        position: "fixed", top: "24px", right: "24px",
        ...glassChip("#a78bfa", active),
        width: "38px", height: "38px",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        color: active ? "#a78bfa" : "#94a3b8",
        fontSize: active ? "17px" : "18px",
        zIndex: 56, userSelect: "none",
      }}
    >{active ? "🪐" : "▦"}</motion.button>
  )
}

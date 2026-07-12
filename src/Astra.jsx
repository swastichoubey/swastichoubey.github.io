import { useState, useEffect } from "react"

const DIALOGUES = [
  "Currently working on the ARENA curriculum and applying to fellowships.",
  "Just finished BlueDot Technical AI Safety. If you know a paper I should read, the contact form is right there.",
  "Still figuring out why models forget things at the tails. Send help. Or papers.",
  "Running on curiosity and white Monster. What flavour is that even?",
]

export function Astra({ onClick }) {
  const [showBubble, setShowBubble] = useState(false)
  const [dialogue, setDialogue]     = useState(DIALOGUES[0])
  const [hovered, setHovered]       = useState(false)

  // Show bubble briefly on mount
  useEffect(() => {
    const t1 = setTimeout(() => setShowBubble(true), 9000)
    const t2 = setTimeout(() => setShowBubble(false), 9000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleClick = () => {
    const next = DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)]
    setDialogue(next)
    setShowBubble(true)
    const t = setTimeout(() => setShowBubble(false), 7000)
    return () => clearTimeout(t)
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "60px",
        left: "24px",
        zIndex: 20,
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div style={{
          position: "absolute",
          bottom: "172px",
          left: "10px",
          width: "220px",
          background: "rgba(6,6,18,0.93)",
          border: "1px solid #1e3a5f",
          borderRadius: "10px",
          padding: "10px 13px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          color: "#94a3b8",
          lineHeight: 1.65,
          letterSpacing: "0.02em",
          animation: "bubbleIn 0.2s ease",
          // little tail pointing down-left
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {dialogue}
          <div style={{
            position: "absolute", bottom: "-7px", left: "18px",
            width: "12px", height: "7px",
            background: "rgba(6,6,18,0.93)",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            borderLeft: "1px solid #1e3a5f",
            borderRight: "1px solid #1e3a5f",
          }} />
        </div>
      )}

      {/* Astra SVG — simplified version of the alien illustration */}
<img
  src="/src/assets/astra.png"
  width="200"
  style={{
    transform: hovered ? "scale(1.08) translateY(-2px)" : "scale(1)",
    transition: "transform 0.2s ease",
    filter: hovered
      ? "drop-shadow(0 0 6px #4ade8088)"
      : "drop-shadow(0 0 3px #4ade8033)",
    display: "block",
  }}
  alt="Astra"
/>

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

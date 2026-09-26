import { THEME, TYPE_LABELS } from "./theme"

const types = ["exploratory", "opinion", "experimental", "project"]

// Colours chosen for contrast on the #05050f background: labels ≈ 9:1,
// hints ≈ 7:1 (both well above WCAG AA's 4.5:1 for small text).
const LABEL = "#aab4c3"
const HINT  = "#94a3b8"

export function Legend() {
  return (
    <div style={{
      position: "fixed", top: "24px", left: "24px",
      fontFamily: "'DM Mono', monospace",
      zIndex: 10, userSelect: "none",
    }}>
      <div style={{ fontSize: "10px", color: "#cbd5e1", letterSpacing: "0.1em", marginBottom: "10px" }}>
        HYBRIDLOGS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {types.map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: THEME[t],
              boxShadow: `0 0 5px ${THEME[t]}88`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "10px", color: LABEL, letterSpacing: "0.08em" }}>
              {TYPE_LABELS[t]}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "10px", fontSize: "9px", color: HINT, letterSpacing: "0.06em", lineHeight: 1.6 }}>
        size · read time<br />
        glow · recency
      </div>

      <div style={{ marginTop: "10px", fontSize: "10px", color: HINT, letterSpacing: "0.06em" }}>
        drag · scroll · click
      </div>
    </div>
  )
}

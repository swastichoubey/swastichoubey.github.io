import { THEME, TYPE_LABELS } from "./theme"

const types = ["exploratory", "implementation", "opinion", "project"]

export function Legend() {
  return (
    <div style={{
      position: "fixed", top: "24px", left: "24px",
      fontFamily: "'DM Mono', monospace",
      zIndex: 10, userSelect: "none",
    }}>
      <div style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "10px" }}>
        SWASTI'S UNIVERSE
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
            <span style={{ fontSize: "9px", color: "#475569", letterSpacing: "0.08em" }}>
              {TYPE_LABELS[t]}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "3px" }}>
          <span style={{
            width: "7px", height: "7px", borderRadius: "50%",
            border: `1px dashed ${THEME.exploratory}55`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "9px", color: "#334155", letterSpacing: "0.08em" }}>Draft</span>
        </div>
      </div>

      <div style={{ marginTop: "14px", fontSize: "9px", color: "#1e293b", letterSpacing: "0.06em" }}>
        drag · scroll · click
      </div>
    </div>
  )
}

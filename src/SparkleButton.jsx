import { THEME } from "./theme"

export function SparkleButton({ children, onClick, href, download, target, rel, style = {} }) {
  const c = THEME.about

  const baseStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    padding: "10px 20px",
    background: "rgba(9, 11, 26, 1)",
    color: c,
    border: `1px solid ${c}88`,
    borderRadius: "8px",
    fontFamily: "'DM Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.06em",
    cursor: "pointer",
    textDecoration: "none",
    transition: "box-shadow 0.3s ease, border-color 0.3s ease",
    ...style,
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    overflow: "visible",
  }

  const content = (
    <>
      <span className="sparkle-stars star-1">✦</span>
      <span className="sparkle-stars star-2">✦</span>
      <span className="sparkle-stars star-3">✦</span>
      {children}
      <style>{`
        .sparkle-stars {
          position: absolute;
          opacity: 0;
          color: #fffdef;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .star-1 { top: -10px; left: -8px;  font-size: 14px; animation: twinkle 1.4s ease-in-out infinite; }
        .star-2 { bottom: -8px; left: 40%; font-size: 8px;  animation: twinkle 1.8s ease-in-out infinite 0.3s; }
        .star-3 { top: 8px;  right: -10px; font-size: 12px; animation: twinkle 1.2s ease-in-out infinite 0.6s; }
        .sparkle-btn:hover .sparkle-stars {
          opacity: 1;
          filter: drop-shadow(0 0 6px #fffdef);
        }
        .sparkle-btn:hover {
          box-shadow: 0 0 15px ${c}55 !important;
          border-color: ${c} !important;
        }
        @keyframes twinkle {
          0%, 100% { transform: scale(0.8) rotate(0deg);  opacity: 0.6; }
          50%       { transform: scale(1.2) rotate(15deg); opacity: 1; }
        }
      `}</style>
    </>
  )

  if (href) {
  return (
    <div style={{ position: "relative", overflow: "visible" }}>
      <a href={href} download={download} target={target} rel={rel}
        className="sparkle-btn" style={baseStyle}>
        {content}
      </a>
    </div>
  )
}

return (
  <div style={{ position: "relative", overflow: "visible" }}>
    <button onClick={onClick} className="sparkle-btn" style={baseStyle}>
      {content}
    </button>
  </div>
)
}
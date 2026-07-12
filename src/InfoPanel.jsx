import { motion } from "motion/react"
import { blogData } from "./data"
import { THEME, TYPE_LABELS, DESTINATION_ICONS } from "./theme"
import { glassPanel, glassCard, glassCardHover, SPRING, EASE_OUT } from "./glass"
import { SparkleButton } from "./SparkleButton"

function nodeColor(node) {
  if (node.type === "ref")   return THEME.ref
  if (node.type === "about") return THEME.about
  return THEME[node.type] || "#ffffff"
}

function ReadButton({ node, onRead }) {
  if (node.type === "ref" || node.type === "about") return null

  const dest     = node.publishedAt
  const platform = dest ? Object.keys(dest)[0] : null
  const url      = dest ? Object.values(dest)[0] : null
  const icon     = platform ? DESTINATION_ICONS[platform] : DESTINATION_ICONS.native

  const handleClick = e => {
    if (!url) {
      e.preventDefault()
      onRead && onRead(node)
    }
  }

  return (
    <div style={{ marginTop: "18px" }}>
      <SparkleButton
        href={url || "#"}
        onClick={handleClick}
        target={url ? "_blank" : "_self"}
        rel="noopener noreferrer"
      >
        <span style={{ fontSize: "13px" }}>{icon}</span> Read Article
      </SparkleButton>
    </div>
  )
}

export function InfoPanel({ node, onClose, onRead }) {
  if (!node) return null
  const color = nodeColor(node)

  const relatedEdges = blogData.edges.filter(e => e.source === node.id || e.target === node.id)
  const relatedIds   = relatedEdges.map(e => e.source === node.id ? e.target : e.source)
  const related      = blogData.nodes.filter(n => relatedIds.includes(n.id))

  return (
    <motion.div
      initial={{ opacity: 0, x: 28, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98, transition: { duration: 0.16, ease: "easeIn" } }}
      transition={SPRING.panel}
      style={{
        position: "fixed", top: "50%", right: "24px",
        translateY: "-50%",
        width: "300px", maxHeight: "80vh", overflowY: "auto",
        ...glassPanel(color),
        padding: "22px",
        color: "#f1f5f9", fontFamily: "'DM Mono', monospace",
        zIndex: 60, scrollbarWidth: "none",
      }}
    >
      {/* Header row — close button right-aligned, NOT overlapping title */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "14px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}88`,
            }} />
            <span style={{ fontSize: "9px", color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {TYPE_LABELS[node.type] || node.type}
              {node.draft && <span style={{ marginLeft: "8px", color: "#64748b" }}>· draft</span>}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#f8fafc", lineHeight: 1.45, paddingRight: "24px" }}>
            {node.title}
          </h2>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "6px",
          color: "#94a3b8", cursor: "pointer", fontSize: "12px",
          lineHeight: 1, padding: "4px 6px", flexShrink: 0, marginLeft: "8px",
        }}>✕</button>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        {node.date && <span style={{ fontSize: "9px", color: "#64748b" }}>{node.date}</span>}
        {node.readTime && <span style={{ fontSize: "9px", color: "#64748b" }}>{node.readTime} min read</span>}
      </div>

      <p style={{ margin: "0 0 16px", fontSize: "11px", color: "#a5b4cb", lineHeight: 1.75 }}>
        {node.excerpt}
      </p>

      {/* Tags */}
      {node.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "16px" }}>
          {node.tags.map(tag => (
            <span key={tag} style={{
              fontSize: "9px", padding: "2px 8px", borderRadius: "4px",
              background: `${color}18`, border: `1px solid ${color}33`, color,
              letterSpacing: "0.06em",
            }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Connected nodes */}
      {related.length > 0 && (
        <>
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px", marginBottom: "10px",
            fontSize: "9px", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>Connected nodes</div>
          {related.map(r => {
            const rc = r.type === "ref" ? THEME.ref : r.type === "about" ? THEME.about : THEME[r.type] || "#fff"
            return (
              <div key={r.id} style={{
                fontSize: "10px", color: "#94a3b8", padding: "5px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", gap: "7px",
              }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: rc, flexShrink: 0 }} />
                {r.title}
              </div>
            )
          })}
        </>
      )}
{node.type === "ref" && node.url && (
  <div style={{ marginTop: "18px" }}>
    <SparkleButton href={node.url} target="_blank" rel="noopener noreferrer">
      ↗ View Source
    </SparkleButton>
  </div>
)}
      <ReadButton node={node} onRead={onRead} />
    </motion.div>
  )
}

import { useState, useMemo } from "react"
import { blogData } from "./data"
import { THEME, TYPE_LABELS } from "./theme"
import { motion } from "motion/react"
import { glassPanel, glassCard, glassCardHover, SPRING, EASE_OUT } from "./glass"

function nodeColor(n) {
  return THEME[n.type] || "#94a3b8"
}

const ALL_TAGS = [...new Set(
  blogData.nodes
    .filter(n => n.type !== "ref" && n.type !== "about" && !n.draft)
    .flatMap(n => n.tags || [])
)].sort()

const ALL_TYPES = ["exploratory", "experimental", "opinion", "project"]

function FilterPill({ label, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 11px", borderRadius: "20px",
      border: `1px solid ${active ? color : color + "44"}`,
      background: active
        ? `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`
        : "rgba(255,255,255,0.02)",
      color: active ? color : "#64748b",
      fontSize: "10px", fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.06em", cursor: "pointer", whiteSpace: "nowrap",
      transition: `all 0.25s ${EASE_OUT}`,
    }}>{label}</button>
  )
}

function ArticleCard({ node, onRead }) {
  const color = nodeColor(node)

  return (
    <div
      onClick={() => onRead(node)}
      style={{
        ...glassCard(color),
        padding: "16px",
        cursor: "pointer",
        transition: `border-color 0.3s ${EASE_OUT}, background 0.3s ${EASE_OUT}, box-shadow 0.3s ${EASE_OUT}`,
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, glassCardHover(color))}
      onMouseLeave={e => Object.assign(e.currentTarget.style, glassCard(color))}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "9px" }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0,
        }} />
        <span style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {TYPE_LABELS[node.type]}
        </span>
        {node.date && <span style={{ marginLeft: "auto", fontSize: "8px", color: "#475569" }}>{node.date}</span>}
      </div>

      <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9",
        lineHeight: 1.4, margin: "0 0 8px", fontFamily: "'DM Mono', monospace" }}>
        {node.title}
      </h3>

      <p style={{ fontSize: "10.5px", color: "#94a3b8", lineHeight: 1.7,
        margin: "0 0 12px", fontFamily: "'DM Mono', monospace", flex: 1 }}>
        {node.excerpt}
      </p>

      {node.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
          {node.tags.map(tag => (
            <span key={tag} style={{
              fontSize: "8px", padding: "2px 7px", borderRadius: "3px",
              background: `${color}14`, border: `1px solid ${color}22`, color,
              letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace",
            }}>{tag}</span>
          ))}
        </div>
      )}

      {node.readTime && (
        <div style={{ fontSize: "9px", color: "#475569", fontFamily: "'DM Mono', monospace" }}>
          {node.readTime} min read
        </div>
      )}
    </div>
  )
}

export function GridView({ onRead, onClose }) {
  const [activeTags,  setActiveTags]  = useState(new Set())
  const [activeTypes, setActiveTypes] = useState(new Set())

  const articles = useMemo(() => {
    return blogData.nodes
      .filter(n => n.type !== "ref" && n.type !== "about" && !n.draft)
      .filter(n => {
        const typeOk = activeTypes.size === 0 || activeTypes.has(n.type)
        const tagOk  = activeTags.size  === 0 || [...activeTags].every(t => n.tags?.includes(t))
        return typeOk && tagOk
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  }, [activeTags, activeTypes])

  const toggleTag  = t => setActiveTags(p  => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })
  const toggleType = t => setActiveTypes(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 5,
      background: "#05050f", overflowY: "auto",
      fontFamily: "'DM Mono', monospace",
    }}>
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={SPRING.snappy}
        onClick={onClose}
        style={{
          position: "fixed", top: "20px", left: "24px",
          ...glassPanel("#a78bfa"),
          borderRadius: "10px", padding: "7px 14px",
          color: "#94a3b8",
          fontFamily: "'DM Mono', monospace", fontSize: "10px",
          letterSpacing: "0.08em", cursor: "pointer", zIndex: 10,
        }}
      >← Universe</motion.button>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 40px 60px" }}>
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", letterSpacing: "0.12em", marginBottom: "4px" }}>
            SWASTI'S UNIVERSE
          </div>
          <div style={{ fontSize: "9px", color: "#1e3a5f" }}>
            grid view · all articles
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "28px" }}>
          {ALL_TYPES.map(t => (
            <FilterPill key={t} label={TYPE_LABELS[t]} color={THEME[t]}
              active={activeTypes.has(t)} onClick={() => toggleType(t)} />
          ))}
          <div style={{ width: "1px", background: "#1e293b", margin: "0 4px" }} />
          {ALL_TAGS.map(t => (
            <FilterPill key={t} label={t} color="#94a3b8"
              active={activeTags.has(t)} onClick={() => toggleTag(t)} />
          ))}
        </div>

        {/* Grid */}
        {articles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", fontSize: "11px", color: "#334155" }}>
            ooh, I haven't worked on anything in that intersection yet.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}>
            {articles.map(node => (
              <ArticleCard key={node.id} node={node} onRead={onRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

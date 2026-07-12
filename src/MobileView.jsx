import { useState, useMemo } from "react"
import { blogData } from "./data"
import { THEME, TYPE_LABELS } from "./theme"

function nodeColor(n) {
  return THEME[n.type] || "#94a3b8"
}

const ALL_TAGS  = [...new Set(
  blogData.nodes
    .filter(n => n.type !== "ref" && n.type !== "about" && !n.draft)
    .flatMap(n => n.tags || [])
)].sort()

const ALL_TYPES = ["exploratory", "implementation", "opinion", "project"]

function FilterPill({ label, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 11px", borderRadius: "20px", flexShrink: 0,
      border: `1px solid ${active ? color : color + "44"}`,
      background: active ? color + "22" : "transparent",
      color: active ? color : "#475569",
      fontSize: "10px", fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.06em", cursor: "pointer",
      transition: "all 0.12s", whiteSpace: "nowrap",
    }}>{label}</button>
  )
}

function ArticleCard({ node, onRead }) {
  const color = nodeColor(node)
  const isDraft = node.draft

  return (
    <div style={{
      borderRadius: "12px",
      border: `1px solid ${color}22`,
      background: "#080812",
      padding: "16px",
      marginBottom: "10px",
      opacity: isDraft ? 0.45 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0,
        }} />
        <span style={{ fontSize: "9px", color: "#475569",
          letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {TYPE_LABELS[node.type]}
        </span>
        {isDraft && <span style={{ fontSize: "9px", color: "#334155", marginLeft: "2px" }}>· draft</span>}
        {node.date && (
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "#334155" }}>{node.date}</span>
        )}
      </div>

      <h3 style={{ fontSize: "14px", fontWeight: 500, color: "#f8fafc",
        lineHeight: 1.4, margin: "0 0 7px", fontFamily: "'DM Mono', monospace" }}>
        {node.title}
      </h3>

      <p style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.7,
        margin: "0 0 12px", fontFamily: "'DM Mono', monospace" }}>
        {node.excerpt}
      </p>

      {node.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
          {node.tags.map(tag => (
            <span key={tag} style={{
              fontSize: "8px", padding: "2px 7px", borderRadius: "3px",
              background: `${color}14`, border: `1px solid ${color}22`, color,
              letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace",
            }}>{tag}</span>
          ))}
        </div>
      )}

      {!isDraft && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {node.readTime && (
            <span style={{ fontSize: "9px", color: "#334155",
              fontFamily: "'DM Mono', monospace" }}>{node.readTime} min</span>
          )}
          <button onClick={() => onRead(node)} style={{
            marginLeft: "auto",
            padding: "7px 14px", borderRadius: "6px",
            border: `1px solid ${color}44`,
            background: `${color}14`, color,
            fontSize: "10px", fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.06em", cursor: "pointer",
            transition: "background 0.12s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}24`}
            onMouseLeave={e => e.currentTarget.style.background = `${color}14`}
          >
            {node.publishedAt ? `Read on ${Object.keys(node.publishedAt)[0]}` : "Read →"}
          </button>
        </div>
      )}
    </div>
  )
}

export function MobileView({ onRead }) {
  const [activeTags,  setActiveTags]  = useState(new Set())
  const [activeTypes, setActiveTypes] = useState(new Set())

  const articles = useMemo(() => {
    return blogData.nodes
      .filter(n => n.type !== "ref" && n.type !== "about")
      .filter(n => {
        const typeOk = activeTypes.size === 0 || activeTypes.has(n.type)
        const tagOk  = activeTags.size  === 0 || [...activeTags].every(t => n.tags?.includes(t))
        return typeOk && tagOk
      })
      .sort((a, b) => {
        if (a.draft && !b.draft) return 1
        if (!a.draft && b.draft) return -1
        return (b.date || "").localeCompare(a.date || "")
      })
  }, [activeTags, activeTypes])

  const toggleTag  = t => setActiveTags(p  => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })
  const toggleType = t => setActiveTypes(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })

  return (
    <div style={{
      minHeight: "100vh", background: "#05050f",
      fontFamily: "'DM Mono', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 20px 16px",
        borderBottom: "1px solid #0f172a",
        background: "rgba(6,6,18,0.95)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: "11px", color: "#475569",
          letterSpacing: "0.12em", marginBottom: "2px" }}>
          SWASTI'S UNIVERSE
        </div>
        <div style={{ fontSize: "9px", color: "#1e3a5f" }}>
          mobile view · 3D experience on desktop
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #0a0f1a" }}>
        <div style={{ fontSize: "8px", color: "#334155",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
          Filter
        </div>
        <div style={{
          display: "flex", gap: "6px", overflowX: "auto",
          paddingBottom: "4px", scrollbarWidth: "none",
        }}>
          {ALL_TYPES.map(t => (
            <FilterPill key={t} label={TYPE_LABELS[t]} color={THEME[t]}
              active={activeTypes.has(t)} onClick={() => toggleType(t)} />
          ))}
          <div style={{ width: "1px", background: "#1e293b", flexShrink: 0, margin: "0 2px" }} />
          {ALL_TAGS.map(t => (
            <FilterPill key={t} label={t} color="#64748b"
              active={activeTags.has(t)} onClick={() => toggleTag(t)} />
          ))}
        </div>
      </div>

      {/* Article cards */}
      <div style={{ padding: "16px 20px 40px" }}>
        {articles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0",
            fontSize: "11px", color: "#334155" }}>
            No articles match these filters.
          </div>
        ) : articles.map(node => (
          <ArticleCard key={node.id} node={node} onRead={onRead} />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid #0a0f1a",
        display: "flex", flexWrap: "wrap", gap: "12px",
      }}>
        {ALL_TYPES.map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%",
              background: THEME[t], boxShadow: `0 0 4px ${THEME[t]}88` }} />
            <span style={{ fontSize: "8px", color: "#334155",
              letterSpacing: "0.07em" }}>{TYPE_LABELS[t]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

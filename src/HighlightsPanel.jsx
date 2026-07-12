import { useState, useEffect, useMemo } from "react"
import { motion } from "motion/react"
import { blogData } from "./data"
import { THEME, TYPE_LABELS } from "./theme"
import { glassPanel, glassCard, glassCardHover, glassDock, SPRING, EASE_OUT } from "./glass"

function nodeColor(node) {
  if (node.type === "ref")   return THEME.ref
  if (node.type === "about") return THEME.about
  return THEME[node.type] || "#ffffff"
}

const ALL_TAGS = [...new Set(
  blogData.nodes
    .filter(n => n.type !== "ref" && n.type !== "about" && !n.draft)
    .flatMap(n => n.tags || [])
)].sort()

const ALL_TYPES = ["exploratory", "implementation", "opinion", "project"]

// Static highlights list (featured + most recent, no dupes)
const recent = [...blogData.nodes]
  .filter(n => n.date && !n.draft && n.type !== "ref" && n.type !== "about")
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 1)

const featured  = blogData.nodes.filter(n => n.featured && !n.draft)
const highlights = [
  ...recent,
  ...featured.filter(n => !recent.find(r => r.id === n.id)),
].slice(0, 4)

// ── helpers ──────────────────────────────────────────────────────────────────
function articlePassesFilter(node, activeTags, activeTypes) {
  if (node.type === "ref" || node.type === "about" || node.draft) return false
  const typeOk = activeTypes.size === 0 || activeTypes.has(node.type)
  const tagOk  = activeTags.size  === 0 || [...activeTags].every(t => node.tags?.includes(t))
  return typeOk && tagOk
}

function FilterPill({ label, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 9px", borderRadius: "20px",
      border: `1px solid ${active ? color : color + "44"}`,
      background: active
        ? `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`
        : "rgba(255,255,255,0.02)",
      boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 12px ${color}22` : "none",
      color: active ? color : "#64748b",
      fontSize: "9px", fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.07em", cursor: "pointer",
      transition: `all 0.25s ${EASE_OUT}`, whiteSpace: "nowrap",
    }}>{label}</button>
  )
}

function HighlightCard({ node, onSelect, onFlyTo }) {
  const color = nodeColor(node)
  return (
    <motion.div
      onClick={() => { onFlyTo(node.id); onSelect(node) }}
      whileHover={{ scale: 1.02, x: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING.snappy}
      style={{
        padding: "10px 12px",
        ...glassCard(color),
        cursor: "pointer",
        transition: `border-color 0.3s ${EASE_OUT}, background 0.3s ${EASE_OUT}, box-shadow 0.3s ${EASE_OUT}`,
        marginBottom: "6px",
      }}
      onMouseEnter={e => Object.assign(e.currentTarget.style, glassCardHover(color))}
      onMouseLeave={e => Object.assign(e.currentTarget.style, glassCard(color))}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
        <span style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {TYPE_LABELS[node.type]}
        </span>
        {node.date && <span style={{ marginLeft: "auto", fontSize: "8px", color: "#475569" }}>{node.date}</span>}
      </div>
      <div style={{ fontSize: "11px", color: "#e2e8f0", lineHeight: 1.4, fontWeight: 500 }}>{node.title}</div>
      {node.readTime && <div style={{ fontSize: "8px", color: "#475569", marginTop: "4px" }}>{node.readTime} min read</div>}
    </motion.div>
  )
}

export function HighlightsPanel({ onSelect, onFlyTo, onFilterChange, hidden, onHide }) {
  const [activeTags,  setActiveTags]  = useState(new Set())
  const [activeTypes, setActiveTypes] = useState(new Set())
  const [showTooltip, setShowTooltip] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 5000)
    return () => clearTimeout(t)
  }, [])

  // Notify parent whenever filters change
  useEffect(() => {
    onFilterChange({ tags: activeTags, types: activeTypes })
  }, [activeTags, activeTypes])

  const toggleTag  = tag  => setActiveTags(p  => { const n = new Set(p); n.has(tag)  ? n.delete(tag)  : n.add(tag);  return n })
  const toggleType = type => setActiveTypes(p => { const n = new Set(p); n.has(type) ? n.delete(type) : n.add(type); return n })
  const clearFilters = () => { setActiveTags(new Set()); setActiveTypes(new Set()) }

  const hasFilters = activeTags.size > 0 || activeTypes.size > 0

  // Count matching articles so we can show empty state
  const matchCount = useMemo(() => {
    if (!hasFilters) return null
    return blogData.nodes.filter(n => articlePassesFilter(n, activeTags, activeTypes)).length
  }, [activeTags, activeTypes, hasFilters])

  if (hidden) {
    return (
      <motion.button
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16, transition: { duration: 0.14, ease: "easeIn" } }}
        transition={SPRING.panel}
        onClick={onHide}
        style={{
          position: "fixed", top: "50%", right: 0,
          translateY: "-50%",
          ...glassDock(true),
          color: "#94a3b8", fontFamily: "'DM Mono', monospace",
          fontSize: "9px", letterSpacing: "0.1em",
          padding: "16px 6px", cursor: "pointer",
          zIndex: 50, writingMode: "vertical-rl",
        }}
      >◈ explore</motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 28, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98, transition: { duration: 0.16, ease: "easeIn" } }}
      transition={SPRING.panel}
      style={{
        position: "fixed", top: "50%", right: "24px",
        translateY: "-50%",
        width: "272px", maxHeight: "82vh", overflowY: "auto",
        ...glassPanel("#64748b"),
        padding: "18px", fontFamily: "'DM Mono', monospace",
        zIndex: 50, scrollbarWidth: "none",
      }}
    >

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "9px", color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Highlights
        </span>
        <div style={{ marginLeft: "auto", position: "relative", display: "flex", alignItems: "center" }}>
          {showTooltip && (
            <div style={{
              position: "absolute", right: "24px", top: "-2px",
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "5px", padding: "4px 8px",
              fontSize: "8px", color: "#94a3b8", whiteSpace: "nowrap",
            }}>click to hide</div>
          )}
          <button onClick={onHide} style={{
            background: "none", border: "none", color: "#64748b",
            cursor: "pointer", fontSize: "13px", padding: "2px",
          }}>✕</button>
        </div>
      </div>

      {/* Highlight cards — hide when filters active and showing no results */}
      {!hasFilters && highlights.map(node => (
        <HighlightCard key={node.id} node={node} onSelect={onSelect} onFlyTo={onFlyTo} />
      ))}

      {/* Filter-active summary */}
      {hasFilters && matchCount !== null && (
        <div style={{
          padding: "8px 12px",
          ...glassCard("#475569"),
          marginBottom: "10px",
          fontSize: "10px", color: "#94a3b8", lineHeight: 1.6,
        }}>
          {matchCount === 0
            ? "ooh, I haven't worked on anything in that intersection yet."
            : `${matchCount} article${matchCount === 1 ? "" : "s"} match`
          }
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "14px 0 12px" }} />

      {/* Filter label */}
      <div style={{ fontSize: "9px", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
        Filter
      </div>

      {/* Type pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
        {ALL_TYPES.map(type => (
          <FilterPill key={type} label={TYPE_LABELS[type]} color={THEME[type]}
            active={activeTypes.has(type)} onClick={() => toggleType(type)} />
        ))}
      </div>

      {/* Tag pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
        {ALL_TAGS.map(tag => (
          <FilterPill key={tag} label={tag} color="#94a3b8"
            active={activeTags.has(tag)} onClick={() => toggleTag(tag)} />
        ))}
      </div>

      {/* Clear */}
      {hasFilters && (
        <button onClick={clearFilters} style={{
          marginTop: "10px", background: "none", border: "none",
          color: "#64748b", fontSize: "9px",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em", cursor: "pointer",
          textDecoration: "underline", padding: 0,
        }}>clear filters</button>
      )}
    </motion.div>
  )
}

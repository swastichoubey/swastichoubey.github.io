import { useState, Suspense, useMemo, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { AnimatePresence } from "motion/react"
import { Scene } from "./Scene"
import { InfoPanel } from "./InfoPanel"
import { AboutPanel } from "./AboutPanel"
import { HighlightsPanel } from "./HighlightsPanel"
import { Legend } from "./Legend"
import { Reader } from "./Reader"
import { MobileView } from "./MobileView"
import { blogData } from "./data"
import { Astra } from "./Astra"
import { ARTICLES } from "./readerContent"

const MOBILE_BREAKPOINT = 768

function nodePassesFilter(node, filters) {
  const { tags, types } = filters
  // Refs always pass — they are moons, not articles, not subject to type/tag filters
  if (node.type === "ref") return true
  // Drafts always pass visually (they show dimmed regardless)
  if (node.draft) return true
  // About node: never matches type/tag filters — will be faded
  if (node.type === "about") return false
  const typeMatch = types.size === 0 || types.has(node.type)
  const tagMatch  = tags.size  === 0 || [...tags].every(t => node.tags?.includes(t))
  return typeMatch && tagMatch
}

function handleReadExternal(node) {
  if (!node.publishedAt) return false
  const url = Object.values(node.publishedAt)[0]
  window.open(url, "_blank", "noopener")
  return true
}

export default function App() {
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < MOBILE_BREAKPOINT)
  const [selected,      setSelected]      = useState(null)
  const [flyTarget,     setFlyTarget]     = useState(null)
  const [panelHidden,   setPanelHidden]   = useState(false)
  const [filters,       setFilters]       = useState({ tags: new Set(), types: new Set() })
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const [aboutView,     setAboutView]     = useState(null)
  const [readerNodeId,  setReaderNodeId]  = useState(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const hasActiveFilter = filters.tags.size > 0 || filters.types.size > 0

  // filteredIds — null means no filter. About node included in fade when filter active.
  const filteredIds = useMemo(() => {
    if (!hasActiveFilter) return null
    return new Set(
      blogData.nodes
        .filter(n => nodePassesFilter(n, filters))
        .map(n => n.id)
      // Note: about node NOT included → it will fade with filters
    )
  }, [filters, hasActiveFilter])

  const openReader = node => {
    if (!node || node.draft) return
    if (handleReadExternal(node)) return
    if (ARTICLES[node.id]) setReaderNodeId(node.id)
  }

  const handleSelect = node => {
    if (node.draft) return
    if (node.type === "about") {
      const next = !aboutExpanded
      setAboutExpanded(next)
      setSelected(null)
      setAboutView(next ? "about" : null)
      if (!next) setPanelHidden(false)
      if (next) handleFlyTo(node.id)
      return
    }
    setAboutExpanded(false)
    setAboutView(null)
    const deselecting = selected?.id === node.id
    setSelected(deselecting ? null : node)
    if (!deselecting) handleFlyTo(node.id)
  }

  // Clicking a moon (or a tab) loads that section into the panel
  const handleSpokeClick = view => {
    setAboutView(view)
  }

  const handleFlyTo = nodeId => {
    setFlyTarget(null)
    setTimeout(() => setFlyTarget(nodeId), 30)
  }

  const handleHighlightSelect = node => {
    handleFlyTo(node.id)
    setSelected(node)
    setPanelHidden(true)
  }

  const handleCloseInfo  = () => { setSelected(null); setPanelHidden(false) }
  const handleCloseAbout = () => {
    setAboutView(null)
    setAboutExpanded(false)
    setPanelHidden(false)
  }
  const handleCloseReader = () => setReaderNodeId(null)

  const handlePointerMissed = () => {
    if (selected) { setSelected(null); setPanelHidden(false) }
    if (aboutView && !aboutExpanded) setAboutView(null)
  }

  const showAboutPanel = !!aboutView
  const showInfoPanel  = !!selected && !showAboutPanel
  const showHighlights = !showAboutPanel && !showInfoPanel

  if (isMobile) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#05050f; }
          ::-webkit-scrollbar { width:3px; height:3px; }
          ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:2px; }
        `}</style>
        {readerNodeId
          ? <Reader nodeId={readerNodeId} onClose={handleCloseReader} />
          : <MobileView onRead={openReader} />
        }
      </>
    )
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#05050f" }}>
      <Canvas
        camera={{ position: [4, 14, 28], fov: 52 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={handlePointerMissed}
      >
        <Suspense fallback={null}>
          <Scene
            selected={selected}
            onSelect={handleSelect}
            flyTarget={flyTarget}
            filteredIds={filteredIds}
            aboutExpanded={aboutExpanded}
            aboutView={aboutView}
            onSpokeClick={handleSpokeClick}
          />
        </Suspense>
      </Canvas>

      <AnimatePresence>
        {showAboutPanel && (
          <AboutPanel
            key="about-panel"
            view={aboutView}
            onViewChange={setAboutView}
            onClose={handleCloseAbout}
          />
        )}
        {showInfoPanel && (
          <InfoPanel key="info-panel" node={selected} onClose={handleCloseInfo} onRead={openReader} />
        )}
        {showHighlights && (
          <HighlightsPanel
            key="highlights-panel"
            onSelect={handleHighlightSelect}
            onFlyTo={handleFlyTo}
            onFilterChange={setFilters}
            hidden={panelHidden}
            onHide={() => setPanelHidden(p => !p)}
          />
        )}
      </AnimatePresence>

      <Legend />
      <Astra />

      {readerNodeId && <Reader nodeId={readerNodeId} onClose={handleCloseReader} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: #05050f; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      `}</style>
    </div>
  )
}

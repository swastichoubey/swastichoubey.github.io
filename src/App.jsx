import { useState, Suspense, useMemo, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { AnimatePresence } from "motion/react"
import { Scene } from "./Scene"
import { InfoPanel } from "./InfoPanel"
import { AboutPanel } from "./AboutPanel"
import { HighlightsPanel } from "./HighlightsPanel"
import { Legend } from "./Legend"
import { HowToPanel } from "./HowToPanel"
import { GridToggle } from "./GridToggle"
import { GridView } from "./GridView"
import { Reader } from "./Reader"
import { MobileView } from "./MobileView"
import { blogData } from "./data"
import { Astra } from "./Astra"
import { AboutButton } from "./AboutButton"
import { PlanetNav } from "./PlanetNav"
import { useReducedMotion } from "./useReducedMotion"

const MOBILE_BREAKPOINT = 768

function nodePassesFilter(node, filters) {
  const { tags, types } = filters
  // Refs always pass — they are moons, not articles, not subject to type/tag filters
  if (node.type === "ref") return true
  // Drafts always pass visually (they show dimmed regardless)
  if (node.draft) return true
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

// Only nodes with real articles (not refs, not drafts) are valid URL targets.
function readableNode(id) {
  return blogData.nodes.find(n => n.id === id && n.type !== "ref" && !n.draft) || null
}

export default function App() {
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < MOBILE_BREAKPOINT)
  const [selected,      setSelected]      = useState(null)
  const [flyTarget,     setFlyTarget]     = useState(null)
  const [panelHidden,   setPanelHidden]   = useState(false)
  const [filters,       setFilters]       = useState({ tags: new Set(), types: new Set() })
  const [aboutView,     setAboutView]     = useState(null)
  const [focusedId,     setFocusedId]     = useState(null)
  // Stop rendering the scene entirely while the tab is hidden.
  const [frameloop,     setFrameloop]     = useState(document.hidden ? "never" : "always")
  const reducedMotion = useReducedMotion()
  const [gridView,      setGridView]      = useState(false)
  // Where the reader was opened from, so its back button can both label
  // itself correctly and land somewhere real — "grid" or null (universe /
  // direct load, where there's no meaningful prior in-app route).
  const [readerOrigin,  setReaderOrigin]  = useState(null)
  const [readerNodeId,  setReaderNodeId]  = useState(() => {
    const id = decodeURIComponent(window.location.pathname.replace(/^\//, ""))
    return readableNode(id)?.id ?? null
  })

  useEffect(() => {
    const onVisibility = () => setFrameloop(document.hidden ? "never" : "always")
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Sync reader state with browser back/forward navigation.
  useEffect(() => {
    const onPopState = () => {
      const id = decodeURIComponent(window.location.pathname.replace(/^\//, ""))
      setReaderNodeId(readableNode(id)?.id ?? null)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const hasActiveFilter = filters.tags.size > 0 || filters.types.size > 0

  // filteredIds — null means no filter.
  const filteredIds = useMemo(() => {
    if (!hasActiveFilter) return null
    return new Set(
      blogData.nodes
        .filter(n => nodePassesFilter(n, filters))
        .map(n => n.id)
    )
  }, [filters, hasActiveFilter])

  const openReader = node => {
    if (!node || node.draft) return
    if (handleReadExternal(node)) return
    setReaderOrigin(gridView ? "grid" : null)
    setReaderNodeId(node.id)
    if (window.location.pathname !== "/" + node.id) {
      window.history.pushState({}, "", "/" + node.id)
    }
  }

  const handleSelect = node => {
    if (node.draft) return
    setAboutView(null)
    const deselecting = selected?.id === node.id
    setSelected(deselecting ? null : node)
    if (!deselecting) handleFlyTo(node.id)
  }

  const toggleAbout = () => {
    setSelected(null)
    setAboutView(v => v ? null : "about")
    setPanelHidden(false)
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
    setPanelHidden(false)
  }
  const handleCloseReader = () => {
    setReaderNodeId(null)
    setReaderOrigin(null)
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/")
    }
  }

  const handlePointerMissed = () => {
    if (selected) { setSelected(null); setPanelHidden(false) }
  }

  const showAboutPanel = !!aboutView
  const showInfoPanel  = !!selected && !showAboutPanel
  const showHighlights = !showAboutPanel && !showInfoPanel

  if (isMobile) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Sans:wght@400;500;600&display=swap');
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#05050f; }
          ::-webkit-scrollbar { width:3px; height:3px; }
          ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:2px; }
        `}</style>
        {readerNodeId
          ? <Reader nodeId={readerNodeId} onClose={handleCloseReader} backLabel="Back" />
          : <MobileView onRead={openReader} />
        }
      </>
    )
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#05050f" }}>
      {gridView ? (
        <GridView onRead={openReader} onClose={() => setGridView(false)} />
      ) : (
        <>
          <Canvas
            camera={{ position: [4, 14, 28], fov: 52 }}
            dpr={[1, 2]}
            frameloop={readerNodeId ? "never" : frameloop}
            gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
            onPointerMissed={handlePointerMissed}
          >
            <Suspense fallback={null}>
              <Scene
                selected={selected}
                onSelect={handleSelect}
                flyTarget={flyTarget}
                filteredIds={filteredIds}
                focusedId={focusedId}
                reducedMotion={reducedMotion}
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
          <AboutButton active={showAboutPanel} onClick={toggleAbout} />
          {!readerNodeId && <PlanetNav onFocusChange={setFocusedId} onOpen={openReader} />}
        </>
      )}

      <HowToPanel />
      <GridToggle active={gridView} onClick={() => setGridView(p => !p)} />

      {readerNodeId && (
        <Reader
          nodeId={readerNodeId}
          onClose={handleCloseReader}
          backLabel={readerOrigin === "grid" ? "Grid" : "Universe"}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Sans:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: #05050f; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      `}</style>
    </div>
  )
}

import { useState, Suspense, useMemo, useEffect, useRef, lazy } from "react"
import { AnimatePresence, motion } from "motion/react"
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
import { preloadArticle } from "./articleStore"

const MOBILE_BREAKPOINT = 768

// Space each right-hand panel takes from the viewport (width + its 24px
// margin); the scene frames itself in what's left.
const PANEL_INSET = { highlights: 296, info: 324, about: 344 }

// Opening an article from the universe: the camera flies into the planet
// (ENTER_MS), and over its last stretch the page fades to the reader's
// background, which the reader then fades in over. Closing reverses it.
// Reduced motion skips the flight and just cross-fades.
const ENTER_MS = 1100
const FADE_IN  = { delay: 0.65, duration: 0.45 }
const FADE_OUT = { duration: 0.45 }
const REDUCED_FADE_MS = 250
const READER_BG = "#05050f"

// The 3D scene (three, R3F, drei, postprocessing) is a separate chunk,
// fetched only when the desktop universe actually renders.
const Universe = lazy(() => import("./Universe"))

function nodePassesFilter(node, filters) {
  const { clusters, types } = filters
  // Refs always pass — they are moons, not articles, not subject to type/cluster filters
  if (node.type === "ref") return true
  // Drafts always pass visually (they show dimmed regardless)
  if (node.draft) return true
  const typeMatch = types.size === 0 || types.has(node.type)
  const clusterMatch = clusters.size === 0 || clusters.has(node.cluster)
  return typeMatch && clusterMatch
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
  const [filters,       setFilters]       = useState({ clusters: new Set(), types: new Set() })
  const [aboutView,     setAboutView]     = useState(null)
  const [focusedId,     setFocusedId]     = useState(null)
  const [focusedRef,    setFocusedRef]    = useState(null)   // "articleId:refId" from keyboard nav
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
  // Fly-in / fly-out between the universe and the reader
  const [enterTarget,   setEnterTarget]   = useState(null)   // { id, nonce }
  const [returnNonce,   setReturnNonce]   = useState(0)
  const [veil,          setVeil]          = useState(null)   // "in" | "out" | null
  const flewIn     = useRef(false)   // reader was opened by flying into a planet
  const entering   = useRef(false)   // a fly-in is in progress

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
      const next = readableNode(id)?.id ?? null
      setReaderNodeId(next)
      if (!next) flyBackOut()
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const hasActiveFilter = filters.clusters.size > 0 || filters.types.size > 0

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

  // Clicking a planet (or Enter on it, or Read in its info panel): fly in,
  // then open the reader. External articles open in a new tab straight away,
  // since a delayed window.open would be blocked as a popup.
  const enterArticle = node => {
    if (!node || node.draft || entering.current) return
    if (handleReadExternal(node)) return
    preloadArticle(node.id)
    entering.current = true
    flewIn.current = true
    setVeil("in")
    if (!reducedMotion) setEnterTarget({ id: node.id, nonce: Date.now() })
    setTimeout(() => {
      entering.current = false
      openReader(node)
      setVeil(null)
    }, reducedMotion ? REDUCED_FADE_MS : ENTER_MS)
  }

  // Leaving a reader we flew into: reverse the flight (the scene tweens back
  // to the saved view) while the veil fades away.
  function flyBackOut() {
    if (!flewIn.current) return
    flewIn.current = false
    setVeil("out")
    setReturnNonce(n => n + 1)
    setTimeout(() => setVeil(null), reducedMotion ? REDUCED_FADE_MS : FADE_OUT.duration * 1000)
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
    flyBackOut()
  }

  const handlePointerMissed = () => {
    if (selected) { setSelected(null); setPanelHidden(false) }
  }

  const showAboutPanel = !!aboutView
  const showInfoPanel  = !!selected && !showAboutPanel
  const showHighlights = !showAboutPanel && !showInfoPanel
  const rightInset = showAboutPanel ? PANEL_INSET.about
    : showInfoPanel ? PANEL_INSET.info
    : !panelHidden ? PANEL_INSET.highlights
    : 0

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
          <Suspense fallback={null}>
            <Universe
              frameloop={readerNodeId ? "never" : frameloop}
              onPointerMissed={handlePointerMissed}
              selected={selected}
              onEnter={enterArticle}
              flyTarget={flyTarget}
              enterTarget={enterTarget}
              returnNonce={returnNonce}
              rightInset={rightInset}
              filteredIds={filteredIds}
              clusterFilter={filters.clusters}
              focusedId={focusedId}
              focusedRef={focusedRef}
              reducedMotion={reducedMotion}
            />
          </Suspense>

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
              <InfoPanel key="info-panel" node={selected} onClose={handleCloseInfo} onRead={enterArticle} />
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
          {!readerNodeId && <PlanetNav onFocusChange={setFocusedId} onRefFocusChange={setFocusedRef} onOpen={enterArticle} />}
        </>
      )}

      <HowToPanel />
      <GridToggle active={gridView} onClick={() => setGridView(p => !p)} />

      {/* Veil: the reader's background colour fading over the scene as the
          camera reaches the planet, and away again on the way back out. */}
      <AnimatePresence>
        {veil && (
          <motion.div
            key="veil"
            initial={{ opacity: veil === "in" ? 0 : 1 }}
            animate={{ opacity: veil === "in" ? 1 : 0 }}
            transition={reducedMotion ? { duration: REDUCED_FADE_MS / 1000 } : veil === "in" ? FADE_IN : FADE_OUT}
            style={{ position: "fixed", inset: 0, zIndex: 90, background: READER_BG, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {readerNodeId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <Reader
            nodeId={readerNodeId}
            onClose={handleCloseReader}
            backLabel={readerOrigin === "grid" ? "Grid" : "Universe"}
          />
        </motion.div>
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

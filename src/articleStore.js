import { useEffect, useState } from "react"
import { ARTICLES as HOLDOUTS } from "./readerContent"

// ─── Article store ───────────────────────────────────────────────────────────
// Reader content is one JSON file per article (/reader/<id>.json, written by
// scripts/build-content.js), fetched when an article is opened instead of
// shipping every article's text in the main bundle. Hand-written holdouts in
// readerContent.js (articles not yet converted to Markdown) stay bundled.

const pending  = new Map()   // id → Promise<article | null>
const resolved = new Map()   // id → article, once loaded

export function loadArticle(id) {
  if (HOLDOUTS[id]) return Promise.resolve(HOLDOUTS[id])
  if (resolved.has(id)) return Promise.resolve(resolved.get(id))
  if (!pending.has(id)) {
    pending.set(id, fetch(`/reader/${encodeURIComponent(id)}.json`)
      .then(res => (res.ok ? res.json() : null))
      .then(article => {
        if (article) resolved.set(id, article)
        else pending.delete(id)
        return article
      })
      .catch(() => { pending.delete(id); return null }))   // allow a retry later
  }
  return pending.get(id)
}

// Start fetching early (e.g. while the camera flies to a planet).
export const preloadArticle = id => { if (id) loadArticle(id) }

// { status: "loading" | "ready" | "missing", article }
export function useArticle(id) {
  const initial = () => {
    const article = HOLDOUTS[id] ?? resolved.get(id)
    return article ? { status: "ready", article } : { status: "loading", article: null }
  }
  const [state, setState] = useState(initial)

  useEffect(() => {
    let cancelled = false
    setState(initial())
    loadArticle(id).then(article => {
      if (!cancelled) setState(article ? { status: "ready", article } : { status: "missing", article: null })
    })
    return () => { cancelled = true }
  }, [id])

  return state
}

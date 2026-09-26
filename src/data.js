// ─── BLOG DATA ───────────────────────────────────────────────────────────────
// Article metadata and references live in content/articles/*.md frontmatter
// (see scripts/build-content.js for the schema) and arrive here through the
// generated graph. This file only adapts that graph into the node/edge shape
// the universe, grid and panels consume.
import { GRAPH } from "./graph.generated"

const draftIds = new Set(GRAPH.articles.filter(a => a.draft).map(a => a.id))

// Clusters with at least one published article. A cluster made only of
// drafts doesn't render (Control stays hidden until its first article ships).
export const visibleClusters = [...new Set(GRAPH.articles.filter(a => !a.draft).map(a => a.cluster))]

const articleNodes = GRAPH.articles.map(a => ({
  id:          a.id,
  type:        a.type,
  title:       a.title,
  excerpt:     a.excerpt,
  tags:        a.tags,
  cluster:     a.cluster,
  date:        a.date,
  readTime:    a.readTime,
  publishedAt: a.publishedAt,
  featured:    a.featured,
  draft:       a.draft,
}))

// Interim until references become moons (Phase 4): each reference is still a
// ref node, anchored to the first published article that cites it.
const refNodes = GRAPH.references.map(r => ({
  id:      r.id,
  type:    "ref",
  title:   r.title,
  excerpt: r.note ?? [r.authors, r.year].filter(Boolean).join(", "),
  tags:    r.kind ? [r.kind] : [],
  parent:  r.citedBy.find(id => !draftIds.has(id)) ?? r.citedBy[0],
  url:     r.url,
}))

export const blogData = {
  nodes: [...articleNodes, ...refNodes],
  edges: [
    ...GRAPH.citations.map(c => ({ source: c.article, target: c.reference })),
    ...GRAPH.related.map(([source, target]) => ({ source, target })),
  ],
}

// A node is visible once it's published — draft articles are hidden entirely,
// and so are their ref moons (a moon can't orbit a planet nobody can see).
export function isVisible(node) {
  if (node.type === "ref") {
    const parent = blogData.nodes.find(n => n.id === node.parent)
    return !parent?.draft
  }
  return !node.draft
}

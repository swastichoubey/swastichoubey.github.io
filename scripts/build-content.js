// Converts content/articles/*.md (frontmatter + Markdown body) into the same
// { [id]: { title, date, readTime, type, blocks, ... } } shape Reader.jsx
// consumes, plus graph.generated.js (article metadata, references, citations)
// for the universe and the reader's reference list. Output is generated, not
// hand-edited.
//
// Inline markdown (links, bold, italic, inline code) is serialized back to
// flat markdown-syntax strings rather than kept as a rich AST, because
// Reader.jsx's renderInline() walks flat text blocks with [text](url) etc.
// embedded, rather than a rich inline node tree.
//
// Directive syntax (remark-directive) covers the three non-standard block
// forms: :::callout{label="..."} ... :::, ::divider[Label], and
// ::figure[caption]{src=... alt=...}. `stats` deliberately uses a plain
// fenced code block (```stats) instead of a directive — it's the block type
// authored most often, and it's meant to be the lightest thing to type.
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkDirective from "remark-directive"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const contentDir = join(root, "content", "articles")
const outFile = join(root, "src", "readerContent.generated.js")
const graphFile = join(root, "src", "graph.generated.js")

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective)

function serializeInline(nodes) {
  return nodes.map(n => {
    if (n.type === "text") return n.value
    if (n.type === "inlineCode") return `\`${n.value}\``
    if (n.type === "strong") return `**${serializeInline(n.children)}**`
    if (n.type === "emphasis") return `*${serializeInline(n.children)}*`
    if (n.type === "delete") return `~~${serializeInline(n.children)}~~`
    if (n.type === "link") {
      // GFM autolinks (bare https://... in source) parse to a link node whose
      // single text child equals the URL — round-trip those back to bare text
      // instead of re-wrapping as [url](url).
      const isAutolink = n.children.length === 1 && n.children[0].type === "text" && n.children[0].value === n.url
      return isAutolink ? n.url : `[${serializeInline(n.children)}](${n.url})`
    }
    if (n.type === "break") return "\n"
    if (n.children) return serializeInline(n.children)
    return ""
  }).join("")
}

// Joins a container/blockquote's paragraph children into one string, the
// same way multi-paragraph blockquotes have always been flattened.
function joinParagraphs(children) {
  return children.filter(c => c.type === "paragraph").map(p => serializeInline(p.children)).join("\n\n")
}

function convertBlock(node) {
  switch (node.type) {
    case "heading":
      return { type: node.depth === 3 ? "subheading" : "heading", text: serializeInline(node.children) }

    case "paragraph":
      return { type: "paragraph", text: serializeInline(node.children) }

    case "blockquote": {
      // A trailing "— Attribution" line becomes a separate `source` field
      // (the .claim-block → blockquote+source extension) — whether it's its
      // own paragraph (blank line between) or just a soft line break within
      // one paragraph, both are common ways to type this.
      const combined = joinParagraphs(node.children)
      const lines = combined.split("\n")
      let text = combined, source
      if (lines.length > 1 && /^—/.test(lines.at(-1).trim())) {
        source = lines.pop().trim()
        text = lines.join("\n").replace(/\n+$/, "")
      }
      const result = { type: "quote", text }
      if (source) result.source = source
      return result
    }

    case "list": {
      const result = {
        type: "list",
        items: node.children.map(li => {
          const para = li.children.find(c => c.type === "paragraph")
          return serializeInline(para ? para.children : [])
        }),
      }
      if (node.ordered) result.ordered = true
      return result
    }

    case "code": {
      if (node.lang === "stats") {
        const items = node.value.split("\n").filter(line => line.trim()).map(line => {
          const [num, label, sub] = line.split("|").map(s => s.trim())
          return { num, label, sub }
        })
        return { type: "stats", items }
      }
      return { type: "code", text: node.value }
    }

    case "thematicBreak":
      return { type: "divider" }

    case "table": {
      const [headerRow, ...bodyRows] = node.children
      return {
        type: "table",
        headers: headerRow.children.map(cell => serializeInline(cell.children)),
        rows: bodyRows.map(row => row.children.map(cell => serializeInline(cell.children))),
      }
    }

    case "image":
      return { type: "image", src: node.url, alt: node.alt || "" }

    case "containerDirective": {
      if (node.name !== "callout") throw new Error(`Unhandled container directive: "${node.name}"`)
      const result = { type: "callout", text: joinParagraphs(node.children) }
      if (node.attributes?.label) result.label = node.attributes.label
      return result
    }

    case "leafDirective": {
      if (node.name === "divider") {
        const label = serializeInline(node.children)
        return label ? { type: "divider", label } : { type: "divider" }
      }
      if (node.name === "figure") {
        const caption = serializeInline(node.children)
        const result = { type: "image", src: node.attributes?.src, alt: node.attributes?.alt || "" }
        if (caption) result.caption = caption
        return result
      }
      throw new Error(`Unhandled leaf directive: "${node.name}"`)
    }

    default:
      throw new Error(`Unhandled mdast node type: "${node.type}" — no mapping defined yet`)
  }
}

// ─── Article metadata + reference graph ─────────────────────────────────────
// Frontmatter is the single source of truth for article metadata. Fields:
//   title, date (YYYY-MM), readTime, type          required
//   cluster                                         required, one of CLUSTERS
//   excerpt, tags                                   used by the universe/grid
//   featured: true                                  appears in highlights panel
//   draft: true                                     hidden everywhere
//   publishedAt: { platform: url }                  opens externally instead of the reader
//   related: [article-id]                           hand-declared link between articles
//   references:                                     external sources cited by the article
//     - id: author-year-keyword                     stable slug, shared across articles
//       title, authors, url                         note optional
//       kind: paper | web                           year required for papers
// A file with frontmatter but no body is metadata-only (external or unwritten
// articles) and gets no reader entry.

const TYPES = ["exploratory", "experimental", "opinion", "project"]
const CLUSTERS = ["Alignment", "Evals", "Control", "Security", "Curiosities"]
const REFERENCE_KINDS = ["paper", "web"]

const warnings = []
const warn = (file, msg) => warnings.push(`${file}: ${msg}`)

// YAML turns a full YYYY-MM-DD into a Date; keep everything as a plain string.
function normalizeDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value === undefined ? undefined : String(value)
}

// arXiv abs/pdf/html variants and trailing slashes point at the same thing.
function normalizeUrl(url) {
  return url
    .replace(/^http:/, "https:")
    .replace(/arxiv\.org\/(pdf|html)\//, "arxiv.org/abs/")
    .replace(/(arxiv\.org\/abs\/\d+\.\d+)(v\d+)?(\.pdf)?/, "$1")
    .replace(/#.*$/, "")
    .replace(/\/$/, "")
}

const OPTIONAL_FRONTMATTER = ["kicker", "meta", "dek", "heroImage", "colophon", "substackUrl"]

const articles = {}
const graphArticles = []
const references = new Map()   // id → merged reference
const citations = []
const files = readdirSync(contentDir).filter(f => f.endsWith(".md")).sort()

for (const file of files) {
  const id = file.replace(/\.md$/, "")
  const raw = readFileSync(join(contentDir, file), "utf8")
  const { data, content } = matter(raw)

  for (const key of ["title", "date", "readTime", "type", "cluster"]) {
    if (data[key] === undefined) warn(file, `missing \`${key}\``)
  }
  if (data.type !== undefined && !TYPES.includes(data.type)) warn(file, `unknown type "${data.type}"`)
  if (data.cluster !== undefined && !CLUSTERS.includes(data.cluster)) warn(file, `unknown cluster "${data.cluster}" (expected one of ${CLUSTERS.join(", ")})`)
  if (!data.draft && !data.excerpt) warn(file, "missing `excerpt`")

  graphArticles.push({
    id,
    title: String(data.title),
    type: data.type,
    cluster: data.cluster ?? null,
    date: normalizeDate(data.date),
    readTime: data.readTime,
    excerpt: data.excerpt ?? "",
    tags: data.tags ?? [],
    featured: data.featured === true,
    draft: data.draft === true,
    publishedAt: data.publishedAt ?? null,
    related: data.related ?? [],
  })

  const seenInArticle = new Set()
  for (const ref of data.references ?? []) {
    if (!ref.id) { warn(file, `reference without an \`id\` (title: ${ref.title ?? "?"})`); continue }
    if (seenInArticle.has(ref.id)) { warn(file, `reference "${ref.id}" listed twice`); continue }
    seenInArticle.add(ref.id)

    const existing = references.get(ref.id)
    if (!existing) {
      references.set(ref.id, { ...ref, citedBy: [id] })
    } else {
      // Same id cited again — the first declaration wins, later ones may only
      // fill in fields it left out. Disagreements are almost always a typo or
      // two different papers sharing a slug.
      for (const key of ["title", "authors", "year", "url", "kind"]) {
        if (ref[key] === undefined) continue
        if (existing[key] === undefined) existing[key] = ref[key]
        else if (String(existing[key]) !== String(ref[key])) {
          warn(file, `reference "${ref.id}" has ${key} ${JSON.stringify(ref[key])}, but ${existing.citedBy[0]} declares ${JSON.stringify(existing[key])}`)
        }
      }
      existing.citedBy.push(id)
    }
    citations.push({ article: id, reference: ref.id })
  }

  // Metadata-only files (no body) don't get a reader entry, so hand-written
  // holdouts in readerContent.js with the same id keep working.
  if (!content.trim()) continue

  const tree = processor.parse(content)
  const blocks = tree.children.map(convertBlock)

  const article = {
    title: String(data.title),
    date: normalizeDate(data.date),
    readTime: data.readTime,
    type: data.type,
  }
  for (const key of OPTIONAL_FRONTMATTER) {
    if (data[key] !== undefined) article[key] = data[key]
  }
  article.blocks = blocks

  articles[id] = article
}

// Cross-file checks
const articleIds = new Set(graphArticles.map(a => a.id))
const relatedPairs = new Map()
for (const a of graphArticles) {
  for (const other of a.related) {
    if (other === a.id) { warn(`${a.id}.md`, "lists itself in `related`"); continue }
    if (!articleIds.has(other)) { warn(`${a.id}.md`, `related article "${other}" does not exist`); continue }
    const pair = [a.id, other].sort()
    relatedPairs.set(pair.join("|"), pair)
  }
}
const byUrl = new Map()
for (const ref of references.values()) {
  // Checked on the merged record, so a shared reference only needs its full
  // details in one of the articles citing it.
  const where = `${ref.citedBy[0]}.md`
  if (!ref.title) warn(where, `reference "${ref.id}" is missing \`title\``)
  if (!REFERENCE_KINDS.includes(ref.kind)) warn(where, `reference "${ref.id}" has kind ${JSON.stringify(ref.kind)} (expected ${REFERENCE_KINDS.join(" or ")})`)
  // Web pages are often undated or living documents; papers always have a year.
  if (!ref.year && ref.kind !== "web") warn(where, `reference "${ref.id}" is missing \`year\``)
  if (!ref.url) warn(where, `reference "${ref.id}" has no \`url\``)
  if (articleIds.has(ref.id)) warn(where, `reference id "${ref.id}" collides with an article id`)
  if (!ref.url) continue
  const key = normalizeUrl(ref.url)
  if (byUrl.has(key)) warn(where, `references "${byUrl.get(key)}" and "${ref.id}" point to the same URL — should they share an id?`)
  else byUrl.set(key, ref.id)
}

const referenceList = [...references.values()]
const graph = {
  clusters: CLUSTERS,
  articles: graphArticles,
  references: referenceList,
  citations,
  related: [...relatedPairs.values()],
  sharedReferences: referenceList.filter(r => r.citedBy.length >= 2).map(r => r.id),
}

const banner = "// AUTO-GENERATED by scripts/build-content.js — do not hand-edit.\n// Source: content/articles/*.md\n\n"
writeFileSync(outFile, banner + "export const ARTICLES = " + JSON.stringify(articles, null, 2) + "\n")
writeFileSync(graphFile, banner + "export const GRAPH = " + JSON.stringify(graph, null, 2) + "\n")

console.log(`Wrote ${Object.keys(articles).length} reader article(s) to ${outFile}`)
for (const id of Object.keys(articles)) console.log(`  - ${id}`)
console.log(`Wrote graph to ${graphFile}: ${graphArticles.length} articles, ${referenceList.length} references, ${citations.length} citations, ${graph.sharedReferences.length} shared, ${graph.related.length} related pair(s)`)

if (warnings.length) {
  console.warn(`\n${warnings.length} content warning(s):`)
  for (const w of warnings) console.warn(`  ⚠ ${w}`)
}

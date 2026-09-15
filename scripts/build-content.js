// Converts content/articles/*.md (frontmatter + Markdown body) into the same
// { [id]: { title, date, readTime, type, blocks, ... } } shape Reader.jsx
// consumes. Output is generated, not hand-edited.
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

const OPTIONAL_FRONTMATTER = ["kicker", "meta", "dek", "heroImage", "colophon"]

const articles = {}
const files = readdirSync(contentDir).filter(f => f.endsWith(".md")).sort()

for (const file of files) {
  const id = file.replace(/\.md$/, "")
  const raw = readFileSync(join(contentDir, file), "utf8")
  const { data, content } = matter(raw)
  const tree = processor.parse(content)
  const blocks = tree.children.map(convertBlock)

  const article = {
    title: String(data.title),
    date: String(data.date),
    readTime: data.readTime,
    type: data.type,
  }
  for (const key of OPTIONAL_FRONTMATTER) {
    if (data[key] !== undefined) article[key] = data[key]
  }
  article.blocks = blocks

  articles[id] = article
}

const banner = "// AUTO-GENERATED by scripts/build-content.js — do not hand-edit.\n// Source: content/articles/*.md\n\n"
const body = "export const ARTICLES = " + JSON.stringify(articles, null, 2) + "\n"
writeFileSync(outFile, banner + body)

console.log(`Wrote ${Object.keys(articles).length} article(s) to ${outFile}`)
for (const id of Object.keys(articles)) console.log(`  - ${id}`)

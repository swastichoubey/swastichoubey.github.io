// Deep-compares readerContent.generated.js against the current hand-written
// readerContent.js for a given set of article ids, to verify the Markdown
// converter is lossless before wiring it into anything.
import { ARTICLES as CURRENT } from "../src/readerContent.js"
import { ARTICLES as GENERATED } from "../src/readerContent.generated.js"

const ids = process.argv.slice(2)
if (ids.length === 0) {
  console.error("Usage: node scripts/verify-content.js <id> [id...]")
  process.exit(1)
}

function diff(path, a, b, out) {
  if (a === b) return
  if (typeof a !== typeof b) { out.push(`${path}: type ${typeof a} vs ${typeof b}`); return }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path}: length ${a.length} vs ${b.length}`)
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) diff(`${path}[${i}]`, a[i], b[i], out)
    return
  }
  if (a && b && typeof a === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) diff(`${path}.${k}`, a[k], b[k], out)
    return
  }
  out.push(`${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`)
}

let anyFail = false
for (const id of ids) {
  const cur = CURRENT[id]
  const gen = GENERATED[id]
  if (!cur) { console.log(`✗ ${id}: not found in current readerContent.js`); anyFail = true; continue }
  if (!gen) { console.log(`✗ ${id}: not found in generated output`); anyFail = true; continue }

  const out = []
  diff(id, cur, gen, out)

  if (out.length === 0) {
    console.log(`✓ ${id}: identical (${cur.blocks.length} blocks)`)
  } else {
    anyFail = true
    console.log(`✗ ${id}: ${out.length} difference(s)`)
    for (const line of out) console.log(`    ${line}`)
  }
}

process.exit(anyFail ? 1 : 0)

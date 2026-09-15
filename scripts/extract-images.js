// One-off: extract base64 data-URI images out of the standalone HTML articles
// into real files under public/articles/<slug>/, per the migration decision
// to never keep base64 blobs in source. Not part of the regular build.
import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const jobs = [
  {
    html: join(root, "articles", "chromadb-score-discrepancy.html"),
    images: [
      { marker: 'class="hero-image"', out: "public/articles/chromadb-score-discrepancy/hero.png" },
      { marker: "<figure", out: "public/articles/chromadb-score-discrepancy/pca-embeddings.png" },
    ],
  },
  {
    html: join(root, "articles", "emb-eval.html"),
    images: [
      { marker: 'class="hero-image"', out: "public/articles/emb-eval/hero.jpg" },
    ],
  },
]

function extractDataUri(html, afterIndex) {
  const start = html.indexOf('src="data:', afterIndex)
  if (start === -1) return null
  const commaIndex = html.indexOf(",", start)
  const endQuote = html.indexOf('"', commaIndex)
  const base64 = html.slice(commaIndex + 1, endQuote)
  return Buffer.from(base64, "base64")
}

for (const job of jobs) {
  const html = readFileSync(job.html, "utf8")
  let cursor = 0
  for (const img of job.images) {
    const markerIndex = html.indexOf(img.marker, cursor)
    if (markerIndex === -1) throw new Error(`marker not found: ${img.marker} in ${job.html}`)
    const buf = extractDataUri(html, markerIndex)
    if (!buf) throw new Error(`no data URI found after marker: ${img.marker}`)
    const outPath = join(root, img.out)
    writeFileSync(outPath, buf)
    console.log(`${img.out}: ${buf.length} bytes`)
    cursor = markerIndex + img.marker.length
  }
}

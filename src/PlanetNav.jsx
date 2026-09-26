import { blogData, isVisible } from "./data"
import { GRAPH } from "./graph.generated"
import { TYPE_LABELS } from "./theme"

// Keyboard and screen-reader access to the planets. One real button per
// visible article, visually hidden: focus moves through them with Tab, the
// focused planet gets an in-world focus ring and label, and Enter opens the
// article. Each article's references follow as links: focusing one shows
// that planet's moons with the matching moon highlighted and labelled, and
// Enter opens the source in a new tab.
const REFERENCES = new Map(GRAPH.references.map(r => [r.id, r]))
const referencesOf = id => GRAPH.citations.filter(c => c.article === id).map(c => REFERENCES.get(c.reference))
const articles = blogData.nodes
  .filter(n => n.type !== "ref" && isVisible(n))
  .sort((a, b) => b.date.localeCompare(a.date))

const visuallyHidden = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
}

export function PlanetNav({ onFocusChange, onRefFocusChange, onOpen }) {
  return (
    <nav aria-label="Articles in the universe" style={visuallyHidden}>
      <ul>
        {articles.map(node => (
          <li key={node.id}>
            <button
              onFocus={() => onFocusChange(node.id)}
              onBlur={() => onFocusChange(null)}
              onClick={() => onOpen(node)}
            >
              {node.title} — {TYPE_LABELS[node.type]}, {node.date}, {node.readTime} min read
            </button>
            {referencesOf(node.id).length > 0 && (
              <ul aria-label={`References cited in ${node.title}`}>
                {referencesOf(node.id).map(ref => (
                  <li key={ref.id}>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onFocus={() => { onFocusChange(node.id); onRefFocusChange(`${node.id}:${ref.id}`) }}
                      onBlur={() => { onFocusChange(null); onRefFocusChange(null) }}
                    >
                      Reference: {ref.title}
                      {(ref.authors || ref.year) && ` — ${[ref.authors, ref.year].filter(Boolean).join(", ")}`}
                      {" "}(opens in a new tab)
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

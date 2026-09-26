import { blogData, isVisible } from "./data"
import { TYPE_LABELS } from "./theme"

// Keyboard and screen-reader access to the planets. One real button per
// visible article, visually hidden: focus moves through them with Tab, the
// focused planet gets an in-world focus ring and label, and Enter opens the
// article.
const articles = blogData.nodes
  .filter(n => n.type !== "ref" && isVisible(n))
  .sort((a, b) => b.date.localeCompare(a.date))

const visuallyHidden = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
}

export function PlanetNav({ onFocusChange, onOpen }) {
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
          </li>
        ))}
      </ul>
    </nav>
  )
}

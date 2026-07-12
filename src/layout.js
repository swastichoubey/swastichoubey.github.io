import { blogData } from "./data"

const ABOUT_POSITION = { x: 0, y: 0, z: 0 }

export function computeLayout() {
  const nodes   = blogData.nodes
  const mains   = nodes.filter(n => n.type !== "ref" && n.id !== "about")
  const refs    = nodes.filter(n => n.type === "ref")
  const positions = {}

  positions["about"] = ABOUT_POSITION

  // Main nodes — wider spread, more z-depth for better tilted-camera look
  const mainR = 13
  mains.forEach((node, i) => {
    const angle = (i / mains.length) * Math.PI * 2 + 0.5
    positions[node.id] = {
      x: Math.cos(angle) * mainR + (Math.random() - 0.5) * 3,
      y: (Math.random() - 0.5) * 5,
      z: Math.sin(angle) * mainR * 0.7 + (Math.random() - 0.5) * 3,
    }
  })

  // Ref nodes — closer orbit, more spread in y
  refs.forEach(node => {
    const parent = positions[node.parent]
    if (!parent) return
    const siblings = refs.filter(n => n.parent === node.parent)
    const idx      = siblings.indexOf(node)
    const angle    = (idx / siblings.length) * Math.PI * 2 + Math.random() * 0.5
    const r        = 3.2 + Math.random() * 0.8
    positions[node.id] = {
      x: parent.x + Math.cos(angle) * r,
      y: parent.y + (Math.random() - 0.5) * 1.8,
      z: parent.z + Math.sin(angle) * r,
    }
  })

  return positions
}

export { ABOUT_POSITION }

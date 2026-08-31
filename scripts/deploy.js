// Builds the site and copies the output to the repo root, which is what
// GitHub Pages serves for this repo (swastichoubey.github.io, no Actions
// workflow — Pages just serves whatever's committed at root on `main`).
//
// IMPORTANT: root index.html must always be restored from index.template.html
// before building. `vite build` uses root index.html as its entry point, and
// index.template.html is the only copy that references /src/main.jsx. If the
// dist-built index.html (which references a pre-built hashed bundle) is ever
// left in place at root, the next build will bundle that stale JS file as if
// it were source, and every future build will silently keep re-packaging the
// same stale content no matter how many times you rebuild.
import { execSync } from "node:child_process"
import { copyFileSync, readdirSync, rmSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

copyFileSync(join(root, "index.template.html"), join(root, "index.html"))

rmSync(join(root, "dist"), { recursive: true, force: true })
for (const f of readdirSync(join(root, "assets"))) {
  if (f.endsWith(".js")) rmSync(join(root, "assets", f))
}

execSync("npx vite build", { cwd: root, stdio: "inherit" })

copyFileSync(join(root, "dist", "index.html"), join(root, "index.html"))
for (const f of readdirSync(join(root, "dist", "assets"))) {
  copyFileSync(join(root, "dist", "assets", f), join(root, "assets", f))
}

console.log("\nDeploy files ready at repo root. Review with `git status`, then commit and push.")

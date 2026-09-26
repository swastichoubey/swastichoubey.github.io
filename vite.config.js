import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds are always production builds, whatever NODE_ENV the environment
// sets. A stray NODE_ENV=development made `vite build` ship React's
// development build and JSX dev transforms (with local file paths). This has
// to run when the config loads: Vite has already resolved its mode by the
// time a config function would run, and a `define` alone leaves the JSX
// transform in dev mode.
if (process.argv.includes('build')) process.env.NODE_ENV = 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
})

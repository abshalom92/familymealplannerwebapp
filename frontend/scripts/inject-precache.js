// Runs after `vite build`. Scans dist/assets/ for all generated files and
// rewrites dist/sw.js with a full PRECACHE list so the SW caches the entire
// app shell on install — no second visit required for offline to work.
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const assetsDir = join(distDir, 'assets')

const assetFiles = readdirSync(assetsDir).map((f) => `/assets/${f}`)
const precache = ['/index.html', '/offline.html', ...assetFiles]

const swPath = join(distDir, 'sw.js')
let sw = readFileSync(swPath, 'utf-8')
sw = sw.replace(
  "const PRECACHE = ['/index.html', '/offline.html']",
  `const PRECACHE = ${JSON.stringify(precache)}`
)
writeFileSync(swPath, sw)
console.log(`[inject-precache] Precaching ${precache.length} files:`)
precache.forEach((f) => console.log(`  ${f}`))

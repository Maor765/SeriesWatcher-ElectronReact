import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqliteDir = join(root, 'node_modules/better-sqlite3')
console.log('Rebuilding better-sqlite3 for Node.js...')
try {
  execSync('npx prebuild-install', { cwd: sqliteDir, stdio: 'inherit' })
} catch { console.warn('prebuild-install failed') }

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronVersion = JSON.parse(readFileSync(join(root, 'node_modules/electron/package.json'), 'utf-8')).version
const sqliteDir = join(root, 'node_modules/better-sqlite3')
console.log(`Rebuilding better-sqlite3 for Electron v${electronVersion}...`)
try {
  execSync(`npx prebuild-install --runtime electron --target ${electronVersion} --arch x64`, { cwd: sqliteDir, stdio: 'inherit' })
} catch {
  console.warn('prebuild-install failed, falling back to @electron/rebuild...')
  try {
    execSync('npx electron-rebuild -f -m node_modules/better-sqlite3', { cwd: root, stdio: 'inherit' })
    console.log('Done.')
  } catch {
    console.warn('electron-rebuild also failed — app may crash when loading better-sqlite3')
  }
}

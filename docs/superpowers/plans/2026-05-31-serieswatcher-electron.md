# SeriesWatcher ElectronReact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Electron 31 + React 18 + TypeScript desktop series tracker at `C:\Users\User\Documents\-My-projects-\SeriesWatcher-ElectronReact` with 6 series lists displayed in a 3×2 grid, per-list colour-coded panels, past-date gold highlighting (all lists except Unknown), MyEpisodes search, and silent first-launch import from the legacy SQL Server .mdf file.

**Architecture:** Electron main process hosts a better-sqlite3 DB and registers IPC handlers; a contextBridge preload exposes a typed `window.electronAPI`; React renderer renders a 3×2 grid of `SeriesPanel` components — no sidebar, no auth. Auto-import runs before the window opens on first launch.

**Tech Stack:** Electron 31, React 18, TypeScript 5, electron-vite 2, better-sqlite3 v12, vitest 2, electron-builder 24.

---

## File Map

| Path | Purpose |
|------|---------|
| `package.json` | deps, scripts, electron-builder config |
| `tsconfig.json` | project references root |
| `tsconfig.node.json` | electron + shared compilation |
| `tsconfig.web.json` | renderer compilation |
| `electron.vite.config.ts` | vite config for all three processes |
| `vitest.config.ts` | test runner |
| `db/schema.sql` | reference SQL (applied inline in dbService) |
| `scripts/sqlite-for-electron.mjs` | rebuild better-sqlite3 for Electron |
| `scripts/sqlite-for-node.mjs` | rebuild better-sqlite3 for Node (tests) |
| `shared/types.ts` | Series, SeriesList, ElectronAPI, date utils |
| `electron/main/dbService.ts` | all SQLite ops — no Electron imports |
| `electron/main/logger.ts` | logMutation helper |
| `electron/main/importer.ts` | silent first-launch import from .mdf via PowerShell |
| `electron/main/index.ts` | BrowserWindow, app lifecycle, initDb, auto-import |
| `electron/main/ipc.ts` | ipcMain.handle registrations |
| `electron/preload/index.ts` | contextBridge.exposeInMainWorld |
| `src/styles/themes.css` | GitHub Warm dark + light CSS variables + per-panel colours |
| `src/styles/index.css` | reset, layout, grid, panel, table, modal, toast |
| `src/components/TopBar.tsx` | title gradient, search, "+ Add Series", theme toggle |
| `src/components/SeriesPanel.tsx` | one panel: coloured header + scrollable table + per-row actions |
| `src/components/SeriesModal.tsx` | add/edit modal — name, date, list dropdown |
| `src/components/Toast.tsx` | auto-dismiss 3s notification |
| `src/App.tsx` | 3×2 grid, state, CRUD orchestration |
| `src/main.tsx` | ReactDOM.createRoot |
| `src/index.html` | HTML entry |
| `resources/icon.png` | 256×256 app icon |
| `tests/dbService.test.ts` | unit tests for all dbService functions |

---

### Task 1: Project Scaffold

**Files:** `package.json`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `electron.vite.config.ts`, `vitest.config.ts`, `.gitignore`, `scripts/sqlite-for-electron.mjs`, `scripts/sqlite-for-node.mjs`

- [ ] **Step 1: Create project directory and subdirectories**

```powershell
New-Item -ItemType Directory -Path "C:\Users\User\Documents\-My-projects-\SeriesWatcher-ElectronReact"
Set-Location "C:\Users\User\Documents\-My-projects-\SeriesWatcher-ElectronReact"
New-Item -ItemType Directory -Path electron\main, electron\preload, shared, src\components, src\styles, db, resources, scripts, tests
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "serieswatcher-electronreact",
  "version": "1.0.0",
  "description": "SeriesWatcher desktop app",
  "main": "out/main/index.js",
  "scripts": {
    "predev": "node scripts/sqlite-for-electron.mjs",
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "dist": "electron-vite build && electron-builder",
    "dist:win": "electron-vite build && electron-builder --win",
    "preview": "electron-vite preview",
    "pretest": "node scripts/sqlite-for-node.mjs",
    "test": "vitest run",
    "test:watch": "node scripts/sqlite-for-node.mjs && vitest"
  },
  "build": {
    "appId": "com.maor.serieswatcher",
    "productName": "SeriesWatcher",
    "directories": { "output": "dist" },
    "files": ["out/**/*", "resources/icon.png"],
    "extraResources": [
      {
        "from": "node_modules/better-sqlite3/build/Release/better_sqlite3.node",
        "to": "better_sqlite3.node"
      }
    ],
    "win": {
      "icon": "resources/icon.png",
      "target": [{ "target": "portable", "arch": ["x64"] }]
    }
  },
  "dependencies": {
    "@electron-toolkit/preload": "^3.0.2",
    "@electron-toolkit/tsconfig": "^2.0.0",
    "@electron-toolkit/utils": "^4.0.0",
    "better-sqlite3": "^12.10.0"
  },
  "devDependencies": {
    "@electron/rebuild": "^4.0.4",
    "@types/better-sqlite3": "^7.6.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^31.3.1",
    "electron-builder": "^24.13.3",
    "electron-vite": "^2.3.0",
    "jsdom": "^24.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^2.0.4"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{ "files": [], "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.web.json" }] }
```

- [ ] **Step 4: Write `tsconfig.node.json`**

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": ["electron/**/*", "shared/**/*", "tests/**/*"],
  "compilerOptions": { "composite": true, "outDir": "dist-electron", "paths": { "@shared/*": ["./shared/*"] } }
}
```

- [ ] **Step 5: Write `tsconfig.web.json`**

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": ["src/**/*", "shared/**/*"],
  "compilerOptions": { "composite": true, "outDir": "dist", "paths": { "@shared/*": ["./shared/*"], "@/*": ["./src/*"] } }
}
```

- [ ] **Step 6: Write `electron.vite.config.ts`**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('shared') } },
    build: { lib: { entry: resolve('electron/main/index.ts') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: resolve('electron/preload/index.ts') } }
  },
  renderer: {
    root: 'src',
    build: { rollupOptions: { input: resolve('src/index.html') } },
    resolve: { alias: { '@shared': resolve('shared'), '@': resolve('src') } },
    plugins: [react()]
  }
})
```

- [ ] **Step 7: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', globals: true, include: ['tests/**/*.test.ts'] } })
```

- [ ] **Step 8: Write `.gitignore`**

```
node_modules/
dist/
out/
dist-electron/
*.db
*.log
```

- [ ] **Step 9: Write `scripts/sqlite-for-electron.mjs`**

```javascript
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
} catch { console.warn('prebuild-install failed') }
```

- [ ] **Step 10: Write `scripts/sqlite-for-node.mjs`**

```javascript
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqliteDir = join(root, 'node_modules/better-sqlite3')
console.log('Rebuilding better-sqlite3 for Node.js...')
try {
  execSync('npx prebuild-install', { cwd: sqliteDir, stdio: 'inherit' })
} catch { console.warn('prebuild-install failed') }
```

- [ ] **Step 11: Install dependencies**

```powershell
npm install
```

- [ ] **Step 12: Init git**

```powershell
git init
git add .
git commit -m "feat: scaffold serieswatcher-electronreact"
```

---

### Task 2: Shared Types

**Files:** `shared/types.ts`

- [ ] **Step 1: Write `shared/types.ts`**

```typescript
export type SeriesList =
  | 'Ending'
  | 'UpComing'
  | 'Fall Ending'
  | 'Unknown'
  | 'Upcoming Movies'
  | 'Israeli'

export type Theme = 'dark' | 'light'

export const SERIES_LISTS: SeriesList[] = [
  'Ending', 'UpComing', 'Fall Ending', 'Unknown', 'Upcoming Movies', 'Israeli'
]

// Lists where past dates are highlighted gold (Unknown is excluded — it tracks last-check, not air date)
export const HIGHLIGHT_LISTS = new Set<SeriesList>(['Ending', 'UpComing', 'Fall Ending', 'Upcoming Movies', 'Israeli'])

export interface Series {
  id: number
  name: string
  date: string   // YYYYMMDD string, e.g. "20260531"
  list: SeriesList
}

export interface ElectronAPI {
  series: {
    list:   (seriesList: SeriesList | 'All') => Promise<Series[]>
    search: (query: string) => Promise<Series[]>
    add:    (series: Omit<Series, 'id'>) => Promise<Series>
    update: (series: Series) => Promise<Series>
    delete: (id: number) => Promise<void>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
}

declare global {
  interface Window { electronAPI: ElectronAPI }
}

export function toInputDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

export function fromInputDate(yyyy_mm_dd: string): string {
  return yyyy_mm_dd.replace(/-/g, '')
}

export function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

export function isPastDate(yyyymmdd: string): boolean {
  if (!yyyymmdd || yyyymmdd.length !== 8) return false
  return yyyymmdd < todayYYYYMMDD()
}

// Strips extra whitespace and dots from a series name (mirrors original app behaviour)
export function normaliseName(name: string): string {
  return name.replace(/\./g, ' ').replace(/\s{2,}/g, ' ').trim()
}
```

- [ ] **Step 2: Commit**

```powershell
git add shared/types.ts
git commit -m "feat: add shared types, HIGHLIGHT_LISTS, date utils, normaliseName"
```

---

### Task 3: dbService TDD

**Files:** `electron/main/dbService.ts`, `tests/dbService.test.ts`, `db/schema.sql`

- [ ] **Step 1: Write failing tests in `tests/dbService.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, listBySeriesList, search, add, update, deleteSeries } from '../electron/main/dbService'

beforeEach(() => { initDb(':memory:') })

describe('add + listBySeriesList', () => {
  it('inserts and retrieves by list', () => {
    add({ name: 'Breaking Bad', date: '20260101', list: 'Ending' })
    const rows = listBySeriesList('Ending')
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Breaking Bad')
    expect(rows[0].id).toBeGreaterThan(0)
  })

  it('add returns new series with id', () => {
    const r = add({ name: 'The Wire', date: '20260201', list: 'UpComing' })
    expect(r.id).toBeGreaterThan(0)
    expect(r.name).toBe('The Wire')
  })

  it('listBySeriesList All returns all sorted by list then date', () => {
    add({ name: 'Show A', date: '20260301', list: 'Ending' })
    add({ name: 'Show B', date: '20260201', list: 'UpComing' })
    const all = listBySeriesList('All')
    expect(all).toHaveLength(2)
    expect(all[0].list).toBe('Ending')
    expect(all[1].list).toBe('UpComing')
  })

  it('returns empty array for empty list', () => {
    expect(listBySeriesList('Unknown')).toEqual([])
  })

  it('sorts within list by date ascending', () => {
    add({ name: 'Later', date: '20261201', list: 'Ending' })
    add({ name: 'Earlier', date: '20260101', list: 'Ending' })
    const rows = listBySeriesList('Ending')
    expect(rows[0].name).toBe('Earlier')
    expect(rows[1].name).toBe('Later')
  })

  it('normalises name on insert', () => {
    add({ name: '  Breaking.Bad  ', date: '20260101', list: 'Ending' })
    expect(listBySeriesList('Ending')[0].name).toBe('Breaking Bad')
  })

  it('supports all 6 lists', () => {
    const lists = ['Ending','UpComing','Fall Ending','Unknown','Upcoming Movies','Israeli'] as const
    lists.forEach((list, i) => add({ name: `Show ${i}`, date: '20260101', list }))
    expect(listBySeriesList('All')).toHaveLength(6)
  })
})

describe('search', () => {
  it('finds by name substring case-insensitive', () => {
    add({ name: 'Breaking Bad', date: '20260101', list: 'Ending' })
    expect(search('breaking')).toHaveLength(1)
    expect(search('BREAK')).toHaveLength(1)
  })

  it('returns empty for no match', () => {
    add({ name: 'The Wire', date: '20260101', list: 'Ending' })
    expect(search('zzznomatch')).toHaveLength(0)
  })

  it('finds across all lists', () => {
    add({ name: 'Show Alpha', date: '20260101', list: 'Ending' })
    add({ name: 'Show Beta',  date: '20260102', list: 'Israeli' })
    expect(search('show')).toHaveLength(2)
  })
})

describe('update', () => {
  it('updates name and date', () => {
    const created = add({ name: 'Old Name', date: '20260101', list: 'Ending' })
    update({ ...created, name: 'New Name', date: '20260601' })
    expect(listBySeriesList('Ending')[0].name).toBe('New Name')
  })

  it('moves series to different list', () => {
    const created = add({ name: 'Show', date: '20260101', list: 'Ending' })
    update({ ...created, list: 'UpComing' })
    expect(listBySeriesList('Ending')).toHaveLength(0)
    expect(listBySeriesList('UpComing')).toHaveLength(1)
  })

  it('returns updated series', () => {
    const created = add({ name: 'Show', date: '20260101', list: 'Ending' })
    const updated = update({ ...created, date: '20260701' })
    expect(updated.date).toBe('20260701')
    expect(updated.id).toBe(created.id)
  })

  it('normalises name on update', () => {
    const created = add({ name: 'Show', date: '20260101', list: 'Ending' })
    const updated = update({ ...created, name: '  New.Name  ' })
    expect(updated.name).toBe('New Name')
  })
})

describe('deleteSeries', () => {
  it('deletes and returns series data', () => {
    const created = add({ name: 'Delete Me', date: '20260101', list: 'Fall Ending' })
    const deleted = deleteSeries(created.id)
    expect(deleted?.name).toBe('Delete Me')
    expect(listBySeriesList('Fall Ending')).toHaveLength(0)
  })

  it('returns undefined for non-existent id', () => {
    expect(deleteSeries(9999)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```powershell
npm test
```

Expected: FAIL — `Cannot find module '../electron/main/dbService'`

- [ ] **Step 3: Write `electron/main/dbService.ts`**

```typescript
import Database from 'better-sqlite3'
import type { Series, SeriesList } from '../../shared/types'
import { normaliseName } from '../../shared/types'
import { logMutation } from './logger'

let _db: Database.Database | null = null
let _logPath = ''

export function initDb(dbPath: string, logPath = ''): void {
  _db = new Database(dbPath)
  _logPath = logPath
  _db.exec(`
    CREATE TABLE IF NOT EXISTS series (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      date  TEXT NOT NULL DEFAULT '',
      list  TEXT NOT NULL
    );
  `)
}

function db(): Database.Database {
  if (!_db) throw new Error('DB not initialised — call initDb first')
  return _db
}

function log(msg: string) { if (_logPath) logMutation(_logPath, msg) }

export function listBySeriesList(seriesList: SeriesList | 'All'): Series[] {
  if (seriesList === 'All')
    return db().prepare('SELECT * FROM series ORDER BY list, date ASC').all() as Series[]
  return db().prepare('SELECT * FROM series WHERE list = ? ORDER BY date ASC').all(seriesList) as Series[]
}

export function search(query: string): Series[] {
  return db()
    .prepare('SELECT * FROM series WHERE name LIKE ? ORDER BY list, name ASC')
    .all(`%${query}%`) as Series[]
}

export function add(series: Omit<Series, 'id'>): Series {
  const name = normaliseName(series.name)
  const result = db()
    .prepare('INSERT INTO series (name, date, list) VALUES (?, ?, ?)')
    .run(name, series.date, series.list)
  const s = { id: result.lastInsertRowid as number, name, date: series.date, list: series.list }
  log(`ADD "${s.name}" → ${s.list} (${s.date})`)
  return s
}

export function update(series: Series): Series {
  const name = normaliseName(series.name)
  const existing = db().prepare('SELECT list FROM series WHERE id = ?').get(series.id) as { list: string } | undefined
  db().prepare('UPDATE series SET name = ?, date = ?, list = ? WHERE id = ?')
    .run(name, series.date, series.list, series.id)
  const s = { ...series, name }
  if (existing && existing.list !== series.list)
    log(`MOVE "${name}" ${existing.list} → ${series.list} (${series.date})`)
  else
    log(`UPDATE "${name}" [${series.list}] (${series.date})`)
  return s
}

export function deleteSeries(id: number): { name: string; list: string } | undefined {
  const row = db().prepare('SELECT name, list FROM series WHERE id = ?').get(id) as { name: string; list: string } | undefined
  if (row) {
    db().prepare('DELETE FROM series WHERE id = ?').run(id)
    log(`DELETE "${row.name}" [${row.list}]`)
  }
  return row
}

export function countAll(): number {
  return (db().prepare('SELECT COUNT(*) as c FROM series').get() as { c: number }).c
}
```

- [ ] **Step 4: Write `db/schema.sql`** (reference only)

```sql
-- Applied inline by dbService.initDb
CREATE TABLE IF NOT EXISTS series (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  date  TEXT NOT NULL DEFAULT '',
  list  TEXT NOT NULL
);
```

- [ ] **Step 5: Run tests — expect all pass**

```powershell
npm test
```

Expected: all 15 tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add electron/main/dbService.ts tests/dbService.test.ts db/schema.sql
git commit -m "feat: dbService with SQLite ops and name normalisation (TDD, 15 tests)"
```

---

### Task 4: Logger + Importer

**Files:** `electron/main/logger.ts`, `electron/main/importer.ts`

- [ ] **Step 1: Write `electron/main/logger.ts`**

```typescript
import { appendFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

function ts(): string { return new Date().toISOString().replace('T', ' ').substring(0, 19) }

export function logMutation(logPath: string, message: string): void {
  mkdirSync(dirname(logPath), { recursive: true })
  appendFileSync(logPath, `[${ts()}] ${message}\n`, 'utf-8')
}
```

- [ ] **Step 2: Write `electron/main/importer.ts`**

```typescript
import { spawnSync } from 'child_process'
import { existsSync, renameSync } from 'fs'
import { add, countAll } from './dbService'
import { logMutation } from './logger'
import type { SeriesList } from '../../shared/types'

interface LegacyRow { name: string; date: string; list: string }

// Maps SQL table name → SeriesList value
const TABLE_MAP: Record<string, SeriesList> = {
  tbl_SeriesEnding:    'Ending',
  tbl_SeriesUpComing:  'UpComing',
  tbl_SeriesFallEnding:'Fall Ending',
  tbl_SeriesUnknown:   'Unknown',
}

export function tryAutoImport(mdfPath: string, logPath: string): void {
  if (!existsSync(mdfPath)) return
  if (countAll() > 0) return   // DB already has data — skip

  const escapedPath = mdfPath.replace(/\\/g, '\\\\')
  const ps = `
$ErrorActionPreference = 'Stop'
try {
  $connStr = "Data Source=(LocalDB)\\\\MSSQLLocalDB;AttachDbFilename=${escapedPath};Integrated Security=True;Connect Timeout=30"
  $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
  $conn.Open()
  $tableMap = @{
    'tbl_SeriesEnding'     = 'Ending'
    'tbl_SeriesUpComing'   = 'UpComing'
    'tbl_SeriesFallEnding' = 'Fall Ending'
    'tbl_SeriesUnknown'    = 'Unknown'
  }
  $rows = @()
  foreach ($tbl in $tableMap.Keys) {
    $list = $tableMap[$tbl]
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT * FROM $tbl"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
      $name = $reader[0].ToString().Trim()
      $date = if ($reader.FieldCount -gt 1) { $reader[1].ToString().Trim() } else { '' }
      if ($name -ne '') { $rows += @{ name = $name; date = $date; list = $list } }
    }
    $reader.Close()
  }
  $conn.Close()
  $rows | ConvertTo-Json -Depth 3
} catch { Write-Error $_.Exception.Message; exit 1 }
`

  const proc = spawnSync('powershell.exe', ['-NonInteractive', '-Command', ps], {
    encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024,
  })

  if (proc.status !== 0) {
    logMutation(logPath, `IMPORT FAILED: ${proc.stderr?.trim()}`)
    return
  }

  let rows: LegacyRow[] = []
  try {
    const parsed = JSON.parse(proc.stdout.trim())
    rows = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    logMutation(logPath, 'IMPORT FAILED: could not parse PowerShell output')
    return
  }

  let imported = 0, skipped = 0
  for (const row of rows) {
    try {
      add({ name: row.name, date: row.date, list: row.list as SeriesList })
      imported++
    } catch { skipped++ }
  }

  logMutation(logPath, `IMPORT ${imported} series from dbSeries.mdf (${skipped} skipped)`)
  try { renameSync(mdfPath, mdfPath + '.imported') } catch { /* non-fatal */ }
}
```

- [ ] **Step 3: Commit**

```powershell
git add electron/main/logger.ts electron/main/importer.ts
git commit -m "feat: logger and silent first-launch importer"
```

---

### Task 5: Electron Main + IPC + Preload

**Files:** `electron/main/index.ts`, `electron/main/ipc.ts`, `electron/preload/index.ts`

- [ ] **Step 1: Write `electron/main/ipc.ts`**

```typescript
import { ipcMain, shell } from 'electron'
import { listBySeriesList, search, add, update, deleteSeries } from './dbService'
import type { SeriesList, Series } from '../../shared/types'

export function registerIpc(): void {
  ipcMain.handle('series:list', (_e, seriesList: SeriesList | 'All') => {
    try { return listBySeriesList(seriesList) } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('series:search', (_e, query: string) => {
    try { return query.trim() ? search(query.trim()) : [] } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('series:add', (_e, series: Omit<Series, 'id'>) => {
    try { return add(series) } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('series:update', (_e, series: Series) => {
    try { return update(series) } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('series:delete', (_e, id: number) => {
    try { deleteSeries(id) } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })
}
```

- [ ] **Step 2: Write `electron/main/index.ts`**

```typescript
import { app, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { initDb } from './dbService'
import { registerIpc } from './ipc'
import { tryAutoImport } from './importer'

function getDbPath()  { return app.isPackaged ? join(dirname(app.getPath('exe')), 'series.db')    : join(process.cwd(), 'series.db') }
function getLogPath() { return app.isPackaged ? join(dirname(app.getPath('exe')), 'mutations.log') : join(process.cwd(), 'mutations.log') }
function getMdfPath() { return app.isPackaged ? join(dirname(app.getPath('exe')), 'dbSeries.mdf') : join(process.cwd(), 'dbSeries.mdf') }

function createWindow(): void {
  const preload = join(__dirname, '../preload/index.js')
  const win = new BrowserWindow({
    width: 1100, height: 700,
    minWidth: 800, minHeight: 500,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false }
  })
  if (!app.isPackaged) win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  const logPath = getLogPath()
  initDb(getDbPath(), logPath)
  tryAutoImport(getMdfPath(), logPath)
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
```

- [ ] **Step 3: Write `electron/preload/index.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../../shared/types'

const api: ElectronAPI = {
  series: {
    list:   (seriesList) => ipcRenderer.invoke('series:list', seriesList),
    search: (query)      => ipcRenderer.invoke('series:search', query),
    add:    (series)     => ipcRenderer.invoke('series:add', series),
    update: (series)     => ipcRenderer.invoke('series:update', series),
    delete: (id)         => ipcRenderer.invoke('series:delete', id),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
```

- [ ] **Step 4: Verify TypeScript compiles**

```powershell
npx tsc --noEmit -p tsconfig.node.json
```

Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add electron/
git commit -m "feat: electron main, ipc, preload"
```

---

### Task 6: CSS — Themes and Base Styles

**Files:** `src/styles/themes.css`, `src/styles/index.css`

- [ ] **Step 1: Write `src/styles/themes.css`**

```css
/* ── GitHub Warm dark ── */
:root[data-theme='dark'] {
  --bg:          #0d1117;
  --surface:     #161b22;
  --surface2:    #1c2128;
  --border:      #30363d;
  --border-soft: #21262d;
  --text-primary:   #e6edf3;
  --text-secondary: #8b949e;
  --text-muted:     #484f58;
  --input-bg:    #0d1117;
  --row-alt:     #111820;
  --shadow:      rgba(0,0,0,0.5);
  --past-bg:     #272012;
  --past-text:   #e3b341;
  --del-bg:      #2a1010;
  --del-text:    #f85149;
  --accent:      #58a6ff;
  --accent-text: #0d1117;
  --scrollbar:   #30363d;

  /* Per-panel accent colours */
  --c-ending:        #58a6ff; --c-ending-dim:        #102030;
  --c-upcoming:      #3fb950; --c-upcoming-dim:      #0e2010;
  --c-fallending:    #e3b341; --c-fallending-dim:    #281e08;
  --c-unknown:       #bc8cff; --c-unknown-dim:       #1e1030;
  --c-upmovies:      #22d3ee; --c-upmovies-dim:      #062028;
  --c-israeli:       #f472b6; --c-israeli-dim:       #2a0a18;
}

/* ── GitHub Warm light ── */
:root[data-theme='light'] {
  --bg:          #f6f8fa;
  --surface:     #ffffff;
  --surface2:    #f0f3f6;
  --border:      #d0d7de;
  --border-soft: #e8ebee;
  --text-primary:   #1f2328;
  --text-secondary: #656d76;
  --text-muted:     #9198a1;
  --input-bg:    #f6f8fa;
  --row-alt:     #f0f3f6;
  --shadow:      rgba(0,0,0,0.08);
  --past-bg:     #fef9c3;
  --past-text:   #92400e;
  --del-bg:      #fee2e2;
  --del-text:    #dc2626;
  --accent:      #0969da;
  --accent-text: #ffffff;
  --scrollbar:   #d0d7de;

  --c-ending:        #0969da; --c-ending-dim:        #dbeafe;
  --c-upcoming:      #1a7f37; --c-upcoming-dim:      #d1fae5;
  --c-fallending:    #9a6700; --c-fallending-dim:    #fef9c3;
  --c-unknown:       #7c3aed; --c-unknown-dim:       #ede9fe;
  --c-upmovies:      #0891b2; --c-upmovies-dim:      #cffafe;
  --c-israeli:       #db2777; --c-israeli-dim:       #fce7f3;
}
```

- [ ] **Step 2: Write `src/styles/index.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  background: var(--bg);
  color: var(--text-primary);
}

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 3px; }

/* ── App layout ── */
.app-layout { height: 100%; display: flex; flex-direction: column; overflow: hidden; }

/* ── TopBar ── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 10px;
  box-shadow: 0 1px 8px var(--shadow);
  z-index: 10;
}
.topbar-title {
  font-size: 15px; font-weight: 800; letter-spacing: -0.3px; white-space: nowrap;
  background: linear-gradient(90deg, #58a6ff, #bc8cff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.topbar-right { display: flex; align-items: center; gap: 7px; }

.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 9px; color: var(--text-muted); font-size: 12px; pointer-events: none; }
.search-input {
  background: var(--input-bg); border: 1px solid var(--border); border-radius: 20px;
  padding: 5px 11px 5px 28px; color: var(--text-primary); font-size: 12px; width: 200px;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: inherit;
}
.search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.search-input::placeholder { color: var(--text-muted); }

.btn-add-primary {
  background: var(--accent); border: none; border-radius: 7px;
  padding: 5px 14px; color: var(--accent-text); font-size: 12px; font-weight: 700;
  cursor: pointer; transition: opacity 0.15s; font-family: inherit; white-space: nowrap;
}
.btn-add-primary:hover { opacity: 0.85; }

.btn-icon {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  padding: 5px 9px; color: var(--text-secondary); font-size: 13px; cursor: pointer;
  transition: border-color 0.15s;
}
.btn-icon:hover { border-color: var(--accent); }

/* ── Counts strip ── */
.counts-strip {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 5px 16px;
  background: var(--surface2); border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.count-chip { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-secondary); }
.count-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.count-chip strong { color: var(--text-primary); font-weight: 700; margin-left: 2px; }
.counts-total { margin-left: auto; font-size: 10px; color: var(--text-muted); }

/* ── 3×2 Grid ── */
.grid {
  flex: 1; display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px; padding: 8px;
  overflow: hidden; min-height: 0;
}

/* ── Panel ── */
.panel {
  display: flex; flex-direction: column;
  background: var(--surface); border-radius: 10px;
  border: 1px solid var(--border);
  overflow: hidden; min-height: 0;
  box-shadow: 0 2px 10px var(--shadow);
}
.panel-header {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px 7px; flex-shrink: 0;
  border-bottom: 1px solid var(--border-soft);
}
.panel-icon   { font-size: 14px; line-height: 1; }
.panel-title  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
.panel-badge  { font-size: 10px; font-weight: 700; border-radius: 9px; padding: 1px 7px; min-width: 20px; text-align: center; }
.panel-scroll { flex: 1; overflow-y: auto; min-height: 0; }

/* Per-panel colour: set --pc and --pd via inline style in React */
.panel { border-top: 2px solid var(--pc, var(--accent)); }
.panel .panel-title  { color: var(--pc, var(--accent)); }
.panel .panel-badge  { background: var(--pd, var(--surface2)); color: var(--pc, var(--accent)); }
.panel thead th      { color: var(--pc, var(--accent)); }
.btn-edit            { background: var(--pd, var(--border)); color: var(--pc, var(--accent)); }
.btn-edit:hover      { background: var(--pc, var(--accent)); color: var(--bg); }

/* ── Series table ── */
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
thead th {
  background: var(--surface2); font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.6px;
  padding: 5px 10px; text-align: left;
  border-bottom: 1px solid var(--border-soft);
  position: sticky; top: 0; z-index: 1;
}
tbody td {
  padding: 6px 10px; font-size: 12px;
  border-bottom: 1px solid var(--border-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
tbody tr:last-child td  { border-bottom: none; }
tbody tr.row-alt td     { background: var(--row-alt); }
tbody tr.row-past td    { background: var(--past-bg); }
tbody tr.row-past .cell-date { color: var(--past-text); font-weight: 700; }
.actions-cell { text-align: right; padding-right: 8px !important; white-space: nowrap; }
.btn-action { border: none; border-radius: 4px; font-size: 10px; padding: 2px 6px; cursor: pointer; margin-left: 2px; font-family: inherit; }
.btn-delete { background: var(--del-bg); color: var(--del-text); }
.btn-delete:hover { opacity: 0.75; }
.btn-myep   { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border) !important; }
.btn-myep:hover { border-color: var(--pc, var(--accent)) !important; color: var(--pc, var(--accent)); }
.empty-cell { text-align: center; color: var(--text-muted); padding: 16px 10px !important; font-size: 11px; font-style: italic; }

/* ── Search overlay ── */
.search-overlay {
  position: absolute; inset: 0;
  background: var(--bg); z-index: 20;
  display: none; flex-direction: column; overflow: hidden;
}
.search-overlay.visible { display: flex; }
.search-overlay-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; background: var(--surface);
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.search-overlay-title { font-size: 13px; color: var(--accent); font-weight: 700; }
.search-overlay-sub   { font-size: 12px; color: var(--text-secondary); }
.btn-clear-search {
  margin-left: auto; background: none; border: 1px solid var(--border);
  border-radius: 6px; padding: 4px 10px; color: var(--text-secondary);
  font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-clear-search:hover { border-color: var(--del-text); color: var(--del-text); }
.search-table-wrap { flex: 1; overflow-y: auto; padding: 10px 16px; }
.search-table { width: 100%; border-collapse: collapse; }
.search-table th {
  text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; color: var(--accent); padding: 6px 10px;
  border-bottom: 2px solid var(--border); background: var(--surface);
  position: sticky; top: 0; z-index: 1;
}
.search-table td { padding: 7px 10px; font-size: 12px; border-bottom: 1px solid var(--border-soft); }

/* List pill in search results */
.list-pill {
  display: inline-block; font-size: 9px; font-weight: 700;
  padding: 2px 8px; border-radius: 10px;
  text-transform: uppercase; letter-spacing: 0.3px;
  border: 1px solid;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  display: none; align-items: center; justify-content: center;
  z-index: 100; backdrop-filter: blur(3px);
}
.modal-overlay.open { display: flex; }
.modal {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 26px; width: 380px; max-width: 90vw;
  box-shadow: 0 12px 50px var(--shadow);
  animation: pop 0.18s cubic-bezier(.34,1.56,.64,1);
}
.modal h2 { font-size: 16px; font-weight: 800; color: var(--accent); margin-bottom: 18px; }
.modal form { display: flex; flex-direction: column; gap: 13px; }
.modal label { display: flex; flex-direction: column; gap: 5px; }
.modal label span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-secondary); font-weight: 600; }
.modal input, .modal select {
  background: var(--input-bg); border: 1px solid var(--border); border-radius: 7px;
  padding: 8px 11px; color: var(--text-primary); font-size: 13px; outline: none;
  font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
}
.modal input:focus, .modal select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.modal select option { background: var(--surface); }
.form-error { color: var(--del-text); font-size: 12px; }
.modal-actions { display: flex; gap: 9px; justify-content: flex-end; margin-top: 4px; }
.btn-cancel {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  padding: 8px 16px; color: var(--text-secondary); font-size: 13px; cursor: pointer; font-family: inherit;
}
.btn-save {
  background: var(--accent); border: none; border-radius: 7px;
  padding: 8px 20px; color: var(--accent-text); font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}
.btn-save:hover { opacity: 0.85; }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 20px; right: 20px;
  background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--accent);
  color: var(--text-primary); padding: 10px 18px; border-radius: 9px;
  font-size: 13px; font-weight: 500; z-index: 300;
  box-shadow: 0 4px 18px var(--shadow);
  animation: slideUp 0.2s ease;
}

@keyframes pop      { from { transform: scale(0.93); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes slideUp  { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
```

- [ ] **Step 3: Commit**

```powershell
git add src/styles/
git commit -m "feat: GitHub Warm theme + base styles (3x2 grid, per-panel colours)"
```

---

### Task 7: TopBar Component

**Files:** `src/components/TopBar.tsx`

- [ ] **Step 1: Write `src/components/TopBar.tsx`**

```tsx
import React from 'react'
import type { Theme, SeriesList } from '../../../shared/types'
import { SERIES_LISTS } from '../../../shared/types'

// Panel colour map (must match themes.css)
export const PANEL_COLORS: Record<SeriesList, { pc: string; pd: string; icon: string }> = {
  'Ending':          { pc: 'var(--c-ending)',     pd: 'var(--c-ending-dim)',     icon: '🔚' },
  'UpComing':        { pc: 'var(--c-upcoming)',   pd: 'var(--c-upcoming-dim)',   icon: '📅' },
  'Fall Ending':     { pc: 'var(--c-fallending)', pd: 'var(--c-fallending-dim)', icon: '🍂' },
  'Unknown':         { pc: 'var(--c-unknown)',    pd: 'var(--c-unknown-dim)',    icon: '❓' },
  'Upcoming Movies': { pc: 'var(--c-upmovies)',   pd: 'var(--c-upmovies-dim)',   icon: '🎬' },
  'Israeli':         { pc: 'var(--c-israeli)',    pd: 'var(--c-israeli-dim)',    icon: '🇮🇱' },
}

interface Props {
  theme: Theme
  onThemeToggle: () => void
  searchQuery: string
  onSearch: (q: string) => void
  onAdd: () => void
  counts: Record<SeriesList, number>
}

function TopBar({ theme, onThemeToggle, searchQuery, onSearch, onAdd, counts }: Props) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0)
  return (
    <>
      <div className="topbar">
        <span className="topbar-title">📺 SeriesWatcher</span>
        <div className="topbar-right">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search all series..."
              value={searchQuery}
              onChange={e => onSearch(e.target.value)}
            />
          </div>
          <button className="btn-add-primary" onClick={onAdd}>+ Add Series</button>
          <button className="btn-icon" onClick={onThemeToggle} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="counts-strip">
        {SERIES_LISTS.map(list => (
          <div key={list} className="count-chip">
            <div className="count-dot" style={{ background: PANEL_COLORS[list].pc }} />
            {list} <strong>{counts[list] ?? 0}</strong>
          </div>
        ))}
        <span className="counts-total">{total} total</span>
      </div>
    </>
  )
}

export default React.memo(TopBar)
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/TopBar.tsx
git commit -m "feat: TopBar with counts strip and PANEL_COLORS map"
```

---

### Task 8: SeriesPanel Component

**Files:** `src/components/SeriesPanel.tsx`

- [ ] **Step 1: Write `src/components/SeriesPanel.tsx`**

```tsx
import type { Series, SeriesList } from '../../../shared/types'
import { isPastDate, toInputDate, HIGHLIGHT_LISTS } from '../../../shared/types'
import { PANEL_COLORS } from './TopBar'

interface Props {
  list: SeriesList
  series: Series[]
  onEdit:   (s: Series) => void
  onDelete: (id: number) => void
}

export default function SeriesPanel({ list, series, onEdit, onDelete }: Props) {
  const { pc, pd, icon } = PANEL_COLORS[list]
  const dateHeader = list === 'Unknown' ? 'Last Check' : 'Date'
  const highlightPast = HIGHLIGHT_LISTS.has(list)

  async function handleMyEp(name: string) {
    await window.electronAPI.shell.openExternal(
      `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(name)}`
    )
  }

  return (
    <div className="panel" style={{ '--pc': pc, '--pd': pd } as React.CSSProperties}>
      <div className="panel-header">
        <span className="panel-icon">{icon}</span>
        <span className="panel-title">{list}</span>
        <span className="panel-badge">{series.length}</span>
      </div>
      <div className="panel-scroll">
        <table>
          <colgroup>
            <col style={{ width: '52%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '26%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>{dateHeader}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {series.length === 0 && (
              <tr><td colSpan={3} className="empty-cell">Empty</td></tr>
            )}
            {series.map((s, i) => {
              const past = highlightPast && isPastDate(s.date)
              const cls  = past ? 'row-past' : i % 2 === 1 ? 'row-alt' : ''
              return (
                <tr key={s.id} className={cls}>
                  <td>{s.name}</td>
                  <td className="cell-date">{toInputDate(s.date)}</td>
                  <td className="actions-cell">
                    <button className="btn-action btn-edit"   onClick={() => onEdit(s)}>✏️</button>
                    <button className="btn-action btn-delete" onClick={() => onDelete(s.id)}>🗑</button>
                    <button className="btn-action btn-myep"   onClick={() => handleMyEp(s.name)}>🔍</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/SeriesPanel.tsx
git commit -m "feat: SeriesPanel — coloured header, date highlight, MyEpisodes button"
```

---

### Task 9: SeriesModal Component

**Files:** `src/components/SeriesModal.tsx`

- [ ] **Step 1: Write `src/components/SeriesModal.tsx`**

```tsx
import { useState } from 'react'
import type { Series, SeriesList } from '../../../shared/types'
import { SERIES_LISTS, toInputDate, fromInputDate, todayYYYYMMDD } from '../../../shared/types'

interface Props {
  entry: Series | null             // null = add mode
  defaultList: SeriesList
  onSave:  (s: Omit<Series, 'id'> & { id?: number }) => Promise<void>
  onClose: () => void
}

export default function SeriesModal({ entry, defaultList, onSave, onClose }: Props) {
  const [name, setName]   = useState(entry?.name ?? '')
  const [date, setDate]   = useState(entry ? toInputDate(entry.date) : toInputDate(todayYYYYMMDD()))
  const [list, setList]   = useState<SeriesList>(entry?.list ?? defaultList)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    await onSave({ id: entry?.id, name: name.trim(), date: fromInputDate(date), list })
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h2>{entry ? 'Edit Series' : 'Add Series'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Name *</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Breaking Bad" autoFocus />
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>
            <span>List</span>
            <select value={list} onChange={e => setList(e.target.value as SeriesList)}>
              {SERIES_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/SeriesModal.tsx
git commit -m "feat: SeriesModal — add/edit with 6-list dropdown"
```

---

### Task 10: Toast Component

**Files:** `src/components/Toast.tsx`

- [ ] **Step 1: Write `src/components/Toast.tsx`**

```tsx
import { useEffect } from 'react'

interface Props { message: string; onDone: () => void }

export default function Toast({ message, onDone }: Props) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{message}</div>
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/Toast.tsx
git commit -m "feat: Toast auto-dismiss 3s"
```

---

### Task 11: App.tsx

**Files:** `src/App.tsx`

- [ ] **Step 1: Write `src/App.tsx`**

```tsx
import { useState, useCallback, useEffect } from 'react'
import type { Series, SeriesList, Theme } from '../../shared/types'
import { SERIES_LISTS } from '../../shared/types'
import TopBar from './components/TopBar'
import SeriesPanel from './components/SeriesPanel'
import SeriesModal from './components/SeriesModal'
import Toast from './components/Toast'

type ModalState = Series | null | undefined   // undefined=closed, null=add, Series=edit

const EMPTY_COUNTS = () =>
  Object.fromEntries(SERIES_LISTS.map(l => [l, 0])) as Record<SeriesList, number>

export default function App() {
  const [theme, setTheme]   = useState<Theme>('dark')
  const [allSeries, setAll] = useState<Record<SeriesList, Series[]>>(
    () => Object.fromEntries(SERIES_LISTS.map(l => [l, []])) as Record<SeriesList, Series[]>
  )
  const [counts, setCounts]       = useState<Record<SeriesList, number>>(EMPTY_COUNTS)
  const [searchQuery, setSearch]  = useState('')
  const [searchResults, setResults] = useState<Series[]>([])
  const [modal, setModal]         = useState<ModalState>(undefined)
  const [toast, setToast]         = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  async function loadAll() {
    const results = await Promise.all(
      SERIES_LISTS.map(async list => ({ list, data: await window.electronAPI.series.list(list) }))
    )
    const next = Object.fromEntries(results.map(r => [r.list, r.data])) as Record<SeriesList, Series[]>
    setAll(next)
    setCounts(Object.fromEntries(results.map(r => [r.list, r.data.length])) as Record<SeriesList, number>)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!searchQuery.trim()) { setResults([]); return }
    window.electronAPI.series.search(searchQuery).then(setResults)
  }, [searchQuery])

  const handleThemeToggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])

  async function handleSave(s: Omit<Series, 'id'> & { id?: number }) {
    if (s.id !== undefined) {
      await window.electronAPI.series.update(s as Series)
      setToast('Series updated')
    } else {
      await window.electronAPI.series.add(s)
      setToast('Series added')
    }
    setModal(undefined)
    await loadAll()
    if (searchQuery.trim()) {
      const fresh = await window.electronAPI.series.search(searchQuery)
      setResults(fresh)
    }
  }

  async function handleDelete(id: number) {
    await window.electronAPI.series.delete(id)
    setToast('Series deleted')
    await loadAll()
    if (searchQuery.trim()) {
      const fresh = await window.electronAPI.series.search(searchQuery)
      setResults(fresh)
    }
  }

  const isSearching = searchQuery.trim().length > 0

  return (
    <div className="app-layout">
      <TopBar
        theme={theme}
        onThemeToggle={handleThemeToggle}
        searchQuery={searchQuery}
        onSearch={setSearch}
        onAdd={() => setModal(null)}
        counts={counts}
      />

      {/* Search overlay */}
      {isSearching && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <div className="search-overlay visible">
            <div className="search-overlay-header">
              <span className="search-overlay-title">Search Results</span>
              <span className="search-overlay-sub">{searchResults.length} found for "{searchQuery}"</span>
              <button className="btn-clear-search" onClick={() => setSearch('')}>✕ Clear</button>
            </div>
            <div className="search-table-wrap">
              <table className="search-table">
                <colgroup>
                  <col style={{ width: '40%' }} /><col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} /><col style={{ width: '24%' }} />
                </colgroup>
                <thead>
                  <tr><th>Name</th><th>List</th><th>Date</th><th style={{ textAlign: 'right', paddingRight: 10 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {searchResults.length === 0
                    ? <tr><td colSpan={4} className="empty-cell">No results</td></tr>
                    : searchResults.map((s, i) => (
                      <tr key={s.id} className={i % 2 === 1 ? 'row-alt' : ''}>
                        <td>{s.name}</td>
                        <td>{s.list}</td>
                        <td>{s.date}</td>
                        <td className="actions-cell">
                          <button className="btn-action btn-edit"   onClick={() => setModal(s)}>✏️</button>
                          <button className="btn-action btn-delete" onClick={() => handleDelete(s.id)}>🗑</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3×2 Grid */}
      {!isSearching && (
        <div className="grid">
          {SERIES_LISTS.map(list => (
            <SeriesPanel
              key={list}
              list={list}
              series={allSeries[list]}
              onEdit={setModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal !== undefined && (
        <SeriesModal
          entry={modal}
          defaultList="Ending"
          onSave={handleSave}
          onClose={() => setModal(undefined)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/App.tsx
git commit -m "feat: App.tsx — 3x2 grid, search overlay, CRUD orchestration"
```

---

### Task 12: Entry Point

**Files:** `src/main.tsx`, `src/index.html`

- [ ] **Step 1: Write `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/themes.css'
import './styles/index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

- [ ] **Step 2: Write `src/index.html`**

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SeriesWatcher</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify renderer TypeScript**

```powershell
npx tsc --noEmit -p tsconfig.web.json
```

- [ ] **Step 4: Commit**

```powershell
git add src/main.tsx src/index.html
git commit -m "feat: renderer entry point"
```

---

### Task 13: App Icon

- [ ] **Step 1: Copy icon from PasswordKeeper project**

```powershell
Copy-Item "C:\Users\User\Documents\-My-projects-\passwordkeeper-electronreact\resources\icon.png" "resources\icon.png"
```

- [ ] **Step 2: Commit**

```powershell
git add resources/icon.png
git commit -m "feat: app icon"
```

---

### Task 14: Smoke Test

- [ ] **Step 1: Run all tests**

```powershell
npm test
```

Expected: all 15 dbService tests PASS.

- [ ] **Step 2: Build**

```powershell
npm run build
```

Expected: `out/` created with no TypeScript/Vite errors.

- [ ] **Step 3: Start dev server**

```powershell
npm run dev
```

Expected: Electron window opens at 1100×700, GitHub Warm dark theme, 3×2 grid of 6 empty panels.

- [ ] **Step 4: Verify CRUD**

- Click **+ Add Series** → modal opens with today's date, Ending pre-selected
- Add "Breaking Bad" to Ending with a past date → row appears with **gold background**
- Add "Stranger Things 5" to UpComing with a future date → row appears without gold
- ✏️ opens modal with existing values; change list to Unknown → row moves to Unknown panel, no gold highlight
- 🗑 removes the row
- Check `mutations.log` in project root — ADD, MOVE, UPDATE, DELETE entries present

- [ ] **Step 5: Verify search**

- Type "breaking" → grid hides, search overlay shows results with list column
- Click ✕ Clear → grid returns

- [ ] **Step 6: Verify MyEpisodes**

- Click 🔍 on any row → default browser opens myepisodes.com search for that show

- [ ] **Step 7: Verify auto-import (if legacy .mdf available)**

- Copy `dbSeries.mdf` next to `series.db` in project root
- Restart dev server → all legacy series appear across panels
- `dbSeries.mdf.imported` file appears; `mutations.log` shows IMPORT entry

- [ ] **Step 8: Verify theme**

- Click ☀️ → light theme; click 🌙 → dark theme

- [ ] **Step 9: Final commit**

```powershell
git add -A
git commit -m "feat: serieswatcher-electronreact — complete implementation"
```

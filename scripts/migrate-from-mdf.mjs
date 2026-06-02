/**
 * One-time migration: reads the legacy dbSeries.mdf via PowerShell
 * and populates series.db in the project root.
 * Run with: node scripts/migrate-from-mdf.mjs [path-to-mdf]
 */
import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const mdfPath = process.argv[2] ??
  'C:\\Users\\User\\Documents\\-My-projects-\\SeriesWatcher\\dbSeries.mdf'

const dbPath = join(root, 'series.db')

if (!existsSync(mdfPath)) {
  console.error(`MDF not found: ${mdfPath}`)
  process.exit(1)
}

console.log(`Reading legacy DB: ${mdfPath}`)

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
  console.error('PowerShell failed:', proc.stderr?.trim())
  process.exit(1)
}

let rows = []
try {
  const parsed = JSON.parse(proc.stdout.trim())
  rows = Array.isArray(parsed) ? parsed : [parsed]
} catch (e) {
  console.error('Failed to parse PowerShell output:', e.message)
  process.exit(1)
}

console.log(`Parsed ${rows.length} rows from legacy DB`)

// Open/create SQLite DB
const Database = require('better-sqlite3')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS series (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    date  TEXT NOT NULL DEFAULT '',
    list  TEXT NOT NULL
  );
`)

function normaliseName(name) {
  return name.replace(/\./g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function formatDate(raw) {
  if (!raw) return ''
  // SQL Server DateTime often comes back as "1/1/2026 12:00:00 AM" or "20260101"
  if (/^\d{8}$/.test(raw)) return raw
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  } catch { return '' }
}

const insert = db.prepare('INSERT OR IGNORE INTO series (name, date, list) VALUES (?, ?, ?)')
const insertMany = db.transaction((rows) => {
  let imported = 0, skipped = 0
  for (const row of rows) {
    const name = normaliseName(row.name)
    const date = formatDate(row.date)
    const result = insert.run(name, date, row.list)
    if (result.changes > 0) imported++
    else skipped++
  }
  return { imported, skipped }
})

const { imported, skipped } = insertMany(rows)

console.log(`✅ Done: ${imported} series imported, ${skipped} skipped (duplicates)`)
console.log(`DB written to: ${dbPath}`)

// Print summary by list
const lists = ['Ending', 'UpComing', 'Fall Ending', 'Unknown']
for (const list of lists) {
  const count = db.prepare('SELECT COUNT(*) as c FROM series WHERE list = ?').get(list).c
  console.log(`  ${list}: ${count}`)
}

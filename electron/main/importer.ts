import { spawnSync } from 'child_process'
import { existsSync, renameSync } from 'fs'
import { add, countAll } from './dbService'
import { logMutation } from './logger'
import type { SeriesList } from '../../shared/types'

interface LegacyRow { name: string; date: string; list: string }

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

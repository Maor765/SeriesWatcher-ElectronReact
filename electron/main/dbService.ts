import Database from 'better-sqlite3'
import type { Series, SeriesList } from '../../shared/types'
import { normaliseName } from '../../shared/types'
import { logMutation } from './logger'

let _db: Database.Database | null = null
let _logPath = ''

export function initDb(dbPath: string, logPath = '', nativeBinding?: string): void {
  _db = new Database(dbPath, nativeBinding ? { nativeBinding } : {})
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
  const s: Series = { id: result.lastInsertRowid as number, name, date: series.date, list: series.list }
  log(`ADD "${s.name}" → ${s.list} (${s.date})`)
  return s
}

export function update(series: Series): Series {
  const name = normaliseName(series.name)
  const existing = db().prepare('SELECT list FROM series WHERE id = ?').get(series.id) as { list: string } | undefined
  db().prepare('UPDATE series SET name = ?, date = ?, list = ? WHERE id = ?')
    .run(name, series.date, series.list, series.id)
  const s: Series = { ...series, name }
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

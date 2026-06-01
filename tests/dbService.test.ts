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

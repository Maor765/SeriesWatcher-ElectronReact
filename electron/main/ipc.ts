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
    try { deleteSeries(id); return null } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    shell.openExternal(url)
  })
}

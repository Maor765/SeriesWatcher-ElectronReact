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
  myepisodes: {
    search: (showName) => ipcRenderer.invoke('myepisodes:search', showName),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

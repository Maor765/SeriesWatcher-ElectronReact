import { useState, useCallback, useEffect } from 'react'
import type { Series, SeriesList, Theme } from '../shared/types'
import { SERIES_LISTS } from '../shared/types'
import TopBar from './components/TopBar'
import SeriesPanel from './components/SeriesPanel'
import SeriesModal from './components/SeriesModal'
import Toast from './components/Toast'
import TabBar from './components/TabBar'
import ContextMenu from './components/ContextMenu'

type ModalState = Series | null | undefined   // undefined=closed, null=add, Series=edit

const EMPTY_COUNTS = () =>
  Object.fromEntries(SERIES_LISTS.map(l => [l, 0])) as Record<SeriesList, number>

export default function App() {
  const [theme, setTheme]   = useState<Theme>('dark')
  const [allSeries, setAll] = useState<Record<SeriesList, Series[]>>(
    () => Object.fromEntries(SERIES_LISTS.map(l => [l, [] as Series[]])) as Record<SeriesList, Series[]>
  )
  const [counts, setCounts]       = useState<Record<SeriesList, number>>(EMPTY_COUNTS)
  const [searchQuery, setSearch]  = useState('')
  const [searchResults, setResults] = useState<Series[]>([])
  const [modal, setModal]         = useState<ModalState>(undefined)
  const [toast, setToast]         = useState('')
  const [activeTab, setActiveTab] = useState<SeriesList>('Ending')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; series: Series } | null>(null)

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

  async function handleMoveToList(series: Series, targetList: SeriesList) {
    const updated = { ...series, list: targetList }
    await window.electronAPI.series.update(updated)
    setToast(`Moved ${series.name} to ${targetList}`)
    await loadAll()
    if (searchQuery.trim()) {
      const fresh = await window.electronAPI.series.search(searchQuery)
      setResults(fresh)
    }
    setContextMenu(null)
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
                      <tr
                        key={s.id}
                        className={i % 2 === 1 ? 'row-alt' : ''}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, series: s })
                        }}
                      >
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

      {/* Tab View */}
      {!isSearching && (
        <>
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SeriesPanel
              list={activeTab}
              series={allSeries[activeTab]}
              onEdit={setModal}
              onDelete={handleDelete}
              onContextMenu={(x, y, series) => setContextMenu({ x, y, series })}
              onShowToast={setToast}
            />
          </div>
        </>
      )}

      {modal !== undefined && (
        <SeriesModal
          entry={modal}
          defaultList="Ending"
          onSave={handleSave}
          onClose={() => setModal(undefined)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          series={contextMenu.series}
          onMove={(targetList) => handleMoveToList(contextMenu.series, targetList)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  )
}

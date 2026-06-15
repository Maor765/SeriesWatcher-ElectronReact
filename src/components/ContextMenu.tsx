import { useEffect, useRef } from 'react'
import type { Series, SeriesList } from '../../shared/types'
import { SERIES_LISTS } from '../../shared/types'

const GOOGLE_SEARCH_LISTS = new Set<SeriesList>(['Upcoming Movies', 'Unknown', 'Israeli'])

interface Props {
  x: number
  y: number
  series: Series
  onEdit: (s: Series) => void
  onDelete: (id: number) => void
  onMove: (targetList: SeriesList) => void
  onShowToast?: (msg: string) => void
  onClose: () => void
}

export default function ContextMenu({ x, y, series, onEdit, onDelete, onMove, onShowToast, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  async function handleSearch() {
    onClose()
    if (GOOGLE_SEARCH_LISTS.has(series.list)) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(series.name)}`, '_blank')
    } else {
      onShowToast?.(`Searching for "${series.name}"...`)
      const showUrl = await window.electronAPI.myepisodes.search(series.name)
      window.open(showUrl || `https://www.google.com/search?q=${encodeURIComponent(series.name)}`, '_blank')
    }
  }

  const moveOptions = SERIES_LISTS.filter(l => l !== series.list)
  const useGoogle = GOOGLE_SEARCH_LISTS.has(series.list)

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}
    >
      <div className="context-menu-title">{series.name}</div>

      <button className="context-menu-item" onClick={() => { onEdit(series); onClose() }}>
        ✏️ Edit
      </button>
      <button className="context-menu-item" onClick={handleSearch}>
        🔍 {useGoogle ? 'Google Search' : 'MyEpisodes'}
      </button>

      <div className="context-menu-divider" />
      <div className="context-menu-header">Move to</div>
      {moveOptions.map(list => (
        <button key={list} className="context-menu-item" onClick={() => { onMove(list); onClose() }}>
          {list}
        </button>
      ))}

      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-item--danger" onClick={() => { onDelete(series.id); onClose() }}>
        🗑 Delete
      </button>
    </div>
  )
}

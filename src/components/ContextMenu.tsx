import { useEffect, useRef } from 'react'
import type { Series, SeriesList } from '../../shared/types'
import { SERIES_LISTS } from '../../shared/types'

interface Props {
  x: number
  y: number
  series: Series
  onMove: (targetList: SeriesList) => void
  onClose: () => void
}

export default function ContextMenu({ x, y, series, onMove, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
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

  const moveOptions = SERIES_LISTS.filter(list => list !== series.list)

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}
    >
      <div className="context-menu-header">Move to:</div>
      {moveOptions.map(list => (
        <button
          key={list}
          className="context-menu-item"
          onClick={() => {
            onMove(list)
            onClose()
          }}
        >
          {list}
        </button>
      ))}
    </div>
  )
}

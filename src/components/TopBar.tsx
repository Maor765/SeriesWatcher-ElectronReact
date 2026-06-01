import React from 'react'
import type { Theme, SeriesList } from '../../shared/types'
import { SERIES_LISTS } from '../../shared/types'

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

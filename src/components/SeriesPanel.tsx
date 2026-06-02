import type { Series, SeriesList } from '../../shared/types'
import { isPastDate, toInputDate, HIGHLIGHT_LISTS, SERIES_LISTS } from '../../shared/types'
import { PANEL_COLORS } from './TopBar'

// Lists that use Google search instead of MyEpisodes
const GOOGLE_SEARCH_LISTS = new Set<SeriesList>(['Upcoming Movies', 'Unknown'])

interface Props {
  list: SeriesList
  series: Series[]
  onEdit:   (s: Series) => void
  onDelete: (id: number) => void
  onMove:   (s: Series, targetList: SeriesList) => void
}

export default function SeriesPanel({ list, series, onEdit, onDelete, onMove }: Props) {
  const { pc, pd, icon } = PANEL_COLORS[list]
  const dateHeader = list === 'Unknown' ? 'Last Check' : 'Date'
  const highlightPast = HIGHLIGHT_LISTS.has(list)
  const otherLists = SERIES_LISTS.filter(l => l !== list)
  const useGoogle = GOOGLE_SEARCH_LISTS.has(list)

  async function handleSearch(name: string) {
    const url = useGoogle
      ? `https://www.google.com/search?q=${encodeURIComponent(name)}`
      : `https://www.google.com/search?q=${encodeURIComponent(`site:myepisodes.com ${name}`)}`
    await window.electronAPI.shell.openExternal(url)
  }

  return (
    <div className="panel" style={{ '--pc': pc, '--pd': pd } as React.CSSProperties}>
      <div className="panel-header">
        <span className="panel-icon">{icon}</span>
        <span className="panel-title">{list}</span>
        <span className="panel-badge">{series.length}</span>
      </div>
      <div className="panel-scroll">
        <table>
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '38%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>{dateHeader}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {series.length === 0 && (
              <tr><td colSpan={3} className="empty-cell">Empty</td></tr>
            )}
            {series.map((s, i) => {
              const past = highlightPast && isPastDate(s.date)
              const cls  = past ? 'row-past' : i % 2 === 1 ? 'row-alt' : ''
              return (
                <tr key={s.id} className={cls}>
                  <td>{s.name}</td>
                  <td className="cell-date">{toInputDate(s.date)}</td>
                  <td className="actions-cell">
                    <button className="btn-action btn-edit"   onClick={() => onEdit(s)} title="Edit">✏️</button>
                    <button className="btn-action btn-delete" onClick={() => onDelete(s.id)} title="Delete">🗑</button>
                    <button className="btn-action btn-myep" onClick={() => handleSearch(s.name)} title={useGoogle ? 'Google Search' : 'MyEpisodes'}>🔍</button>
                    <select
                      className="btn-action btn-move"
                      value=""
                      title="Move to list"
                      onChange={e => { if (e.target.value) onMove(s, e.target.value as SeriesList) }}
                    >
                      <option value="">⇄</option>
                      {otherLists.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

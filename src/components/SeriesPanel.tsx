import type { Series, SeriesList } from '../../shared/types'
import { isPastDate, toInputDate, HIGHLIGHT_LISTS } from '../../shared/types'
import { PANEL_COLORS } from './TopBar'

// Lists where 🔍 does a plain Google search (not MyEpisodes + Google)
const GOOGLE_SEARCH_LISTS = new Set<SeriesList>(['Upcoming Movies', 'Unknown', 'Israeli'])

interface Props {
  list: SeriesList
  series: Series[]
  onEdit:   (s: Series) => void
  onDelete: (id: number) => void
}

export default function SeriesPanel({ list, series, onEdit, onDelete }: Props) {
  const { pc, pd, icon } = PANEL_COLORS[list]
  const dateHeader = list === 'Unknown' ? 'Last Check' : 'Date'
  const highlightPast = HIGHLIGHT_LISTS.has(list)
  const useGoogle = GOOGLE_SEARCH_LISTS.has(list)

  function handleSearch(name: string) {
    if (useGoogle) {
      // Movies/Unknown: Google search only
      window.open(`https://www.google.com/search?q=${encodeURIComponent(name)}`, '_blank')
    } else {
      // Series: open both MyEpisodes and Google in separate tabs
      window.open(`https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(name)}`, '_blank')
      window.open(`https://www.google.com/search?q=${encodeURIComponent(name)}`, '_blank')
    }
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
            <col style={{ width: '42%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '36%' }} />
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
                  <td title={s.name}>{s.name}</td>
                  <td className="cell-date">{toInputDate(s.date)}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => onEdit(s)}
                      title="Edit / Move"
                    >✏️</button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => onDelete(s.id)}
                      title="Delete"
                    >🗑</button>
                    <button
                      className="btn-action btn-myep"
                      onClick={() => handleSearch(s.name)}
                      title={useGoogle ? 'Google Search' : 'MyEpisodes + Google'}
                    >🔍</button>
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

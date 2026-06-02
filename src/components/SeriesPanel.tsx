import type { Series, SeriesList } from '../../shared/types'
import { isPastDate, toInputDate, HIGHLIGHT_LISTS } from '../../shared/types'
import { PANEL_COLORS } from './TopBar'

// Lists where 🔍 does a plain Google search (not site:myepisodes.com)
const GOOGLE_SEARCH_LISTS = new Set<SeriesList>(['Upcoming Movies', 'Unknown'])

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

  function searchUrl(name: string): string {
    return useGoogle
      ? `https://www.google.com/search?q=${encodeURIComponent(name)}`
      : `https://www.google.com/search?q=${encodeURIComponent(`site:myepisodes.com ${name}`)}`
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
                    <a
                      href={searchUrl(s.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-action btn-myep"
                      title={useGoogle ? 'Google Search' : 'MyEpisodes'}
                    >🔍</a>
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

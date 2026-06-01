import type { Series, SeriesList } from '../../../shared/types'
import { isPastDate, toInputDate, HIGHLIGHT_LISTS } from '../../../shared/types'
import { PANEL_COLORS } from './TopBar'

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

  async function handleMyEp(name: string) {
    await window.electronAPI.shell.openExternal(
      `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(name)}`
    )
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
            <col style={{ width: '52%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '26%' }} />
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
                    <button className="btn-action btn-edit"   onClick={() => onEdit(s)}>✏️</button>
                    <button className="btn-action btn-delete" onClick={() => onDelete(s.id)}>🗑</button>
                    <button className="btn-action btn-myep"   onClick={() => handleMyEp(s.name)}>🔍</button>
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

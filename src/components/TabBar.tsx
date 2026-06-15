import type { SeriesList } from '../../shared/types'
import { PANEL_COLORS } from './TopBar'

export const TAB_GROUPS: [SeriesList, SeriesList][] = [
  ['Ending',          'UpComing'],
  ['Fall Ending',     'Unknown'],
  ['Upcoming Movies', 'Israeli'],
]

interface Props {
  activeGroup: number
  onGroupChange: (group: number) => void
  counts: Record<SeriesList, number>
}

export default function TabBar({ activeGroup, onGroupChange, counts }: Props) {
  return (
    <div className="tab-bar">
      {TAB_GROUPS.map(([a, b], i) => (
        <button
          key={i}
          className={`tab ${activeGroup === i ? 'active' : ''}`}
          onClick={() => onGroupChange(i)}
        >
          <span className="tab-label">
            {PANEL_COLORS[a].icon} {a}
            <span className="tab-sep"> · </span>
            {PANEL_COLORS[b].icon} {b}
          </span>
          <span className="tab-badge">{(counts[a] ?? 0) + (counts[b] ?? 0)}</span>
        </button>
      ))}
    </div>
  )
}

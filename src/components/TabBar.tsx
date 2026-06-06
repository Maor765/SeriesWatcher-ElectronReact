import type { SeriesList } from '../../shared/types'
import { SERIES_LISTS } from '../../shared/types'

interface Props {
  activeTab: SeriesList
  onTabChange: (tab: SeriesList) => void
  counts: Record<SeriesList, number>
}

export default function TabBar({ activeTab, onTabChange, counts }: Props) {
  return (
    <div className="tab-bar">
      {SERIES_LISTS.map(list => (
        <button
          key={list}
          className={`tab ${activeTab === list ? 'active' : ''}`}
          onClick={() => onTabChange(list)}
          title={list}
        >
          <span className="tab-label">{list}</span>
          <span className="tab-badge">{counts[list]}</span>
        </button>
      ))}
    </div>
  )
}

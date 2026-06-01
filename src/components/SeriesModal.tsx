import { useState } from 'react'
import type { Series, SeriesList } from '../../../shared/types'
import { SERIES_LISTS, toInputDate, fromInputDate, todayYYYYMMDD } from '../../../shared/types'

interface Props {
  entry: Series | null             // null = add mode
  defaultList: SeriesList
  onSave:  (s: Omit<Series, 'id'> & { id?: number }) => Promise<void>
  onClose: () => void
}

export default function SeriesModal({ entry, defaultList, onSave, onClose }: Props) {
  const [name, setName]   = useState(entry?.name ?? '')
  const [date, setDate]   = useState(entry ? toInputDate(entry.date) : toInputDate(todayYYYYMMDD()))
  const [list, setList]   = useState<SeriesList>(entry?.list ?? defaultList)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    await onSave({ id: entry?.id, name: name.trim(), date: fromInputDate(date), list })
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h2>{entry ? 'Edit Series' : 'Add Series'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Name *</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Breaking Bad" autoFocus />
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>
            <span>List</span>
            <select value={list} onChange={e => setList(e.target.value as SeriesList)}>
              {SERIES_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

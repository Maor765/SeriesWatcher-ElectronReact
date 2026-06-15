import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import type { Series, SeriesList } from '../../shared/types'
import { SERIES_LISTS, todayYYYYMMDD } from '../../shared/types'

interface Props {
  entry: Series | null
  defaultList: SeriesList
  onSave:  (s: Omit<Series, 'id'> & { id?: number }) => Promise<void>
  onClose: () => void
}

function yyyymmddToDate(s: string): Date | null {
  if (!s || s.length !== 8) return null
  return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
}

function dateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export default function SeriesModal({ entry, defaultList, onSave, onClose }: Props) {
  const [name, setName]   = useState(entry?.name ?? '')
  const [date, setDate]   = useState<Date | null>(
    entry ? yyyymmddToDate(entry.date) : yyyymmddToDate(todayYYYYMMDD())
  )
  const [list, setList]   = useState<SeriesList>(entry?.list ?? defaultList)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    await onSave({ id: entry?.id, name: name.trim(), date: date ? dateToYYYYMMDD(date) : '', list })
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h2>{entry ? 'Edit / Move' : 'Add Series'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            <span>List</span>
            <select value={list} onChange={e => setList(e.target.value as SeriesList)}>
              {SERIES_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label>
            <span>Name *</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Breaking Bad" autoFocus />
          </label>
          <label>
            <span>Date</span>
            <DatePicker
              selected={date}
              onChange={d => setDate(d)}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              className="datepicker-input"
              calendarClassName="datepicker-calendar"
              wrapperClassName="datepicker-wrapper"
            />
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

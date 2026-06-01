export type SeriesList =
  | 'Ending'
  | 'UpComing'
  | 'Fall Ending'
  | 'Unknown'
  | 'Upcoming Movies'
  | 'Israeli'

export type Theme = 'dark' | 'light'

export const SERIES_LISTS: SeriesList[] = [
  'Ending', 'UpComing', 'Fall Ending', 'Unknown', 'Upcoming Movies', 'Israeli'
]

// Lists where past dates are highlighted gold (Unknown is excluded — it tracks last-check, not air date)
export const HIGHLIGHT_LISTS = new Set<SeriesList>(['Ending', 'UpComing', 'Fall Ending', 'Upcoming Movies', 'Israeli'])

export interface Series {
  id: number
  name: string
  date: string   // YYYYMMDD string, e.g. "20260531"
  list: SeriesList
}

export interface ElectronAPI {
  series: {
    list:   (seriesList: SeriesList | 'All') => Promise<Series[]>
    search: (query: string) => Promise<Series[]>
    add:    (series: Omit<Series, 'id'>) => Promise<Series>
    update: (series: Series) => Promise<Series>
    delete: (id: number) => Promise<void>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
}

declare global {
  interface Window { electronAPI: ElectronAPI }
}

export function toInputDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return ''
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

export function fromInputDate(yyyy_mm_dd: string): string {
  return yyyy_mm_dd.replace(/-/g, '')
}

export function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

export function isPastDate(yyyymmdd: string): boolean {
  if (!yyyymmdd || yyyymmdd.length !== 8) return false
  return yyyymmdd < todayYYYYMMDD()
}

// Strips extra whitespace and dots from a series name (mirrors original app behaviour)
export function normaliseName(name: string): string {
  return name.replace(/\./g, ' ').replace(/\s{2,}/g, ' ').trim()
}

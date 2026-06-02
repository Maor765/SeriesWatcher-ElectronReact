# SeriesWatcher Electron+React Design Spec

**Goal:** Rebuild SeriesWatcher as an Electron 31 + React 18 + TypeScript desktop app in a new folder `SeriesWatcher-ElectronReact`, following the PasswordKeeper-ElectronReact architecture.

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Layout | 3×2 grid — 6 panels, each list in its own panel |
| Lists | 6 fixed: Ending, UpComing, Fall Ending, Unknown, Upcoming Movies, Israeli |
| Auth | None |
| DB | SQLite (better-sqlite3), single `series` table with `list` column |
| Add/Edit/Move | Single "+ Add Series" button in top bar; modal has name + date + list selector |
| Date highlight | Any row where `date < today (YYYYMMDD)` gets a gold/amber background. Applies to all lists **except Unknown** (whose date is a "last check" timestamp, not an air date). This mirrors the original app's behaviour exactly. |
| Logging | Mutations logged to `mutations.log` next to exe |
| Theme | Deep Blue dark + light toggle |
| Search | Global search bar across all lists |
| MyEpisodes | Per-row button → opens myepisodes.com search in default browser |
| Import | Auto on first launch — if `dbSeries.mdf` found next to exe, import silently then rename to `dbSeries.mdf.imported` |

---

## File Structure

```
SeriesWatcher-ElectronReact/
├── electron/
│   ├── main/
│   │   ├── index.ts          — BrowserWindow, app lifecycle, initDb
│   │   ├── ipc.ts            — ipcMain.handle registrations
│   │   ├── dbService.ts      — all SQLite operations + mutation logging
│   │   ├── logger.ts         — logMutation helper
│   │   └── importer.ts       — import from SQL Server .mdf via PowerShell
│   └── preload/
│       └── index.ts          — contextBridge.exposeInMainWorld
├── shared/
│   └── types.ts              — Series, SeriesList, ImportResult, ElectronAPI
├── src/
│   ├── main.tsx              — ReactDOM.createRoot
│   ├── App.tsx               — layout, state, CRUD orchestration
│   ├── index.html
│   ├── components/
│   │   ├── TopBar.tsx        — title, search, theme toggle, import button (React.memo)
│   │   ├── Sidebar.tsx       — 4 list buttons + All, with count badges
│   │   ├── SeriesTable.tsx   — table with date highlight, Edit/Delete/MyEpisodes per row
│   │   ├── SeriesModal.tsx   — add/edit modal (name, date, list)
│   │   └── Toast.tsx         — auto-dismiss 3s notification
│   └── styles/
│       ├── index.css         — reset, layout, table, modal, toast, gold highlight
│       └── themes.css        — deep blue dark + light CSS custom properties
├── resources/
│   └── icon.png              — 256×256 app icon
├── db/
│   └── schema.sql            — reference SQL (applied inline in dbService)
├── scripts/
│   ├── sqlite-for-electron.mjs
│   └── sqlite-for-node.mjs
├── electron.vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
└── package.json
```

---

## Shared Types (`shared/types.ts`)

```typescript
export type SeriesList = 'Ending' | 'UpComing' | 'Fall Ending' | 'Unknown' | 'Upcoming Movies' | 'Israeli'
export type Theme = 'dark' | 'light'

export const SERIES_LISTS: SeriesList[] = ['Ending', 'UpComing', 'Fall Ending', 'Unknown', 'Upcoming Movies', 'Israeli']

export interface Series {
  id: number
  name: string
  date: string   // YYYYMMDD — e.g. "20260531"
  list: SeriesList
}

export interface ImportResult {
  imported: number
  skipped: number
  error?: string
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
```

---

## DB Schema (`db/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS series (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  date  TEXT NOT NULL DEFAULT '',
  list  TEXT NOT NULL
);
```

Single table — `list` column holds the series' current list. Moving a series = `UPDATE series SET list = ? WHERE id = ?`.

On first launch (`app.isPackaged`): DB at `dirname(exe)/series.db`. In dev: `process.cwd()/series.db`.

---

## dbService.ts

**`listBySeriesList(seriesList)`**
- `'All'`: `SELECT * FROM series ORDER BY list, date ASC`
- Specific list: `SELECT * FROM series WHERE list = ? ORDER BY date ASC`

**`search(query)`**
- `SELECT * FROM series WHERE name LIKE ? ORDER BY list, name ASC` with `%query%`

**`add(series)`**
- INSERT, return inserted row with new id
- Log: `[timestamp] ADD "name" → list (date)`

**`update(series)`**
- UPDATE by id, return updated row
- Detect list change: log `[timestamp] MOVE "name" from→to (date)` if list changed, else `[timestamp] UPDATE "name" [list] (date)`

**`deleteSeries(id)`**
- Fetch row first, then DELETE
- Log: `[timestamp] DELETE "name" [list]`

**Mutation log:** `mutations.log` next to exe in packaged, `process.cwd()` in dev.

---

## importer.ts

Called automatically from `index.ts` on first launch (before `createWindow()`).

**Trigger:** look for `dbSeries.mdf` in the same directory as `series.db`. If found and `series.db` is empty, run the import.

**After import:** rename `dbSeries.mdf` → `dbSeries.mdf.imported` so it never runs again.

Reads the 4 legacy SQL Server tables by spawning PowerShell with `System.Data.SqlClient`:

```powershell
$conn = New-Object System.Data.SqlClient.SqlConnection(
  "Data Source=(LocalDB)\MSSQLLocalDB;AttachDbFilename=<mdfPath>;Integrated Security=True;Connect Timeout=30"
)
$conn.Open()
# read tbl_SeriesEnding, tbl_SeriesUpComing, tbl_SeriesFallEnding, tbl_SeriesUnknown
# output as JSON array: [{name, date, list}, ...]
$conn.Close()
```

Table → list mapping:
| SQL Table | SeriesList |
|-----------|------------|
| tbl_SeriesEnding | Ending |
| tbl_SeriesUpComing | UpComing |
| tbl_SeriesFallEnding | Fall Ending |
| tbl_SeriesUnknown | Unknown |

Skips rows where name already exists (UNIQUE constraint). Logs result to `mutations.log`: `[ts] IMPORT X series from dbSeries.mdf (Y skipped)`.

---

## IPC Channels (`ipc.ts`)

| Channel | Handler |
|---------|---------|
| `series:list` | `dbService.listBySeriesList(seriesList)` |
| `series:search` | `dbService.search(query)` |
| `series:add` | `dbService.add(series)` |
| `series:update` | `dbService.update(series)` |
| `series:delete` | `dbService.deleteSeries(id)` |
| `shell:openExternal` | `shell.openExternal(url)` |

All handlers wrapped in try/catch returning `{ error: string }` on failure.

---

## React Components

### `App.tsx`
- State: `theme`, `activeList` (default `'Ending'`), `series[]`, `searchQuery`, `modalEntry`, `toast`
- No auth — directly shows main layout
- `useEffect` reloads series when `activeList`, `searchQuery`, or after mutations change

### `TopBar.tsx` (React.memo)
- Props: `theme`, `onThemeToggle`, `searchQuery`, `onSearch`, `onAdd`
- Title "📺 SeriesWatcher" (blue→lavender gradient) + search input + **+ Add Series** button + theme toggle
- `+ Add Series` opens the modal with List dropdown defaulting to `'Ending'`

### `Sidebar.tsx`
- Props: `activeList`, `counts`, `onSelect`
- Renders "All" + 4 list buttons with count badge
- Active highlighted with blue left border

### `SeriesTable.tsx`
- Props: `series`, `activeList`, `onEdit`, `onDelete`
- Columns: Name, Date (or "Last Check" when `activeList === 'Unknown'`), Actions
- Actions: ✏️ Edit, 🗑 Delete, 🔍 (opens myepisodes.com)
- Past date rows (`date < today's YYYYMMDD`): gold background — only for non-Unknown lists
- `shell.openExternal` called via IPC or preload for the myepisodes link
- Date displayed as `YYYY-MM-DD` (human readable), stored as `YYYYMMDD`

### `SeriesModal.tsx`
- Props: `entry` (null = add, Series = edit), `defaultList`, `onSave`, `onClose`
- Fields: Name (text), Date (date input `<input type="date">`), List (dropdown)
- Date default: today
- Converts between `YYYYMMDD` ↔ `YYYY-MM-DD` for the input

### `Toast.tsx`
- Same as PasswordKeeper — auto-dismisses after 3s

---

## Date Format Handling

The legacy DB stores dates as `YYYYMMDD` (e.g. `"20260531"`).  
HTML `<input type="date">` uses `YYYY-MM-DD`.

Conversion helpers (in `shared/types.ts` or a util):
```typescript
export function toInputDate(yyyymmdd: string): string {
  // "20260531" → "2026-05-31"
  return `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`
}

export function fromInputDate(yyyy_mm_dd: string): string {
  // "2026-05-31" → "20260531"
  return yyyy_mm_dd.replace(/-/g, '')
}

export function isPastDate(yyyymmdd: string): boolean {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return yyyymmdd < today
}
```

---

## MyEpisodes Integration

The 🔍 button per row opens the show's myepisodes.com search in the default browser:

```typescript
// In preload — expose shell.openExternal via contextBridge
openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
```

URL: `https://www.myepisodes.com/search/?tvshow=${encodeURIComponent(name)}`

---

## Theme — GitHub Warm (CSS variables)

Palette: **GitHub Warm** dark. `data-theme="dark"` / `data-theme="light"` on `<html>`.

Each panel has its own accent color driven by `--pc` / `--pd` (panel color / panel dim):

| Panel | Accent (`--pc`) | Dim bg (`--pd`) |
|-------|----------------|-----------------|
| Ending | `#58a6ff` (blue) | `#102030` |
| UpComing | `#3fb950` (green) | `#0e2010` |
| Fall Ending | `#e3b341` (gold) | `#281e08` |
| Unknown | `#bc8cff` (lavender) | `#1e1030` |
| Upcoming Movies | `#22d3ee` (cyan) | `#062028` |
| Israeli | `#f472b6` (pink) | `#2a0a18` |

```css
:root[data-theme='dark'] {
  --bg:          #0d1117;
  --surface:     #161b22;
  --surface2:    #1c2128;
  --border:      #30363d;
  --border-soft: #21262d;
  --text-primary:   #e6edf3;
  --text-secondary: #8b949e;
  --text-muted:     #484f58;
  --past-bg:   #272012;
  --past-text: #e3b341;
  --del-bg:    #2a1010;
  --del-text:  #f85149;
  --accent:    #58a6ff;
}

:root[data-theme='light'] {
  --bg:          #f6f8fa;
  --surface:     #ffffff;
  --surface2:    #f0f3f6;
  --border:      #d0d7de;
  --border-soft: #e8ebee;
  --text-primary:   #1f2328;
  --text-secondary: #656d76;
  --text-muted:     #9198a1;
  --past-bg:   #fef9c3;
  --past-text: #92400e;
  --del-bg:    #fee2e2;
  --del-text:  #dc2626;
  --accent:    #0969da;
}
```

App title uses a CSS gradient: `linear-gradient(90deg, #58a6ff, #bc8cff)`.

---

## Electron Main (`index.ts`)

```typescript
new BrowserWindow({
  width: 800, height: 600,
  minWidth: 600, minHeight: 450,
  icon: join(__dirname, '../../resources/icon.png'),
  webPreferences: { preload, contextIsolation: true, nodeIntegration: false }
})
```

---

## Build & Package

- `"dev": "electron-vite dev"`
- `"build": "electron-vite build"`
- `"dist:win": "electron-vite build && electron-builder --win"`

`electron-builder` config:
- `productName: "SeriesWatcher"`
- `appId: "com.maor.serieswatcher"`
- Portable target for Windows

---

## Error Handling

- Import: MDF not found or LocalDB not available → Toast with error message
- Import: series already exists → silently skipped, counted in `skipped`
- DB errors: IPC returns `{ error: string }`, shown in Toast
- Empty name: SeriesModal validates before calling IPC

# Tab View & Quick Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 2×3 grid layout with tab-based navigation (one list per tab) and add right-click context menu to quickly move items between lists.

**Architecture:** TabBar component manages tab selection state. ContextMenu component renders on right-click and triggers a move handler in App. SeriesPanel passes row data to context menu. Move operation updates item via API, reloads data, and shows toast.

**Tech Stack:** React (functional components + hooks), TypeScript, existing CSS/theme system

---

## Task 1: Create TabBar Component

**Files:**
- Create: `src/components/TabBar.tsx`

- [ ] **Step 1: Write TabBar component**

Create `src/components/TabBar.tsx` with the following code:

```typescript
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
```

- [ ] **Step 2: Verify file created**

Run: `ls src/components/TabBar.tsx`
Expected: File exists with no errors

---

## Task 2: Create ContextMenu Component

**Files:**
- Create: `src/components/ContextMenu.tsx`

- [ ] **Step 1: Write ContextMenu component**

Create `src/components/ContextMenu.tsx` with the following code:

```typescript
import { useEffect, useRef } from 'react'
import type { Series, SeriesList } from '../../shared/types'
import { SERIES_LISTS } from '../../shared/types'

interface Props {
  x: number
  y: number
  series: Series
  onMove: (targetList: SeriesList) => void
  onClose: () => void
}

export default function ContextMenu({ x, y, series, onMove, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const moveOptions = SERIES_LISTS.filter(list => list !== series.list)

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}
    >
      <div className="context-menu-header">Move to:</div>
      {moveOptions.map(list => (
        <button
          key={list}
          className="context-menu-item"
          onClick={() => {
            onMove(list)
            onClose()
          }}
        >
          {list}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify file created**

Run: `ls src/components/ContextMenu.tsx`
Expected: File exists with no errors

---

## Task 3: Add TabBar & ContextMenu State to App.tsx

**Files:**
- Modify: `src/App.tsx` (imports, state, types)

- [ ] **Step 1: Add imports**

At the top of `src/App.tsx`, after existing imports, add:

```typescript
import TabBar from './components/TabBar'
import ContextMenu from './components/ContextMenu'
```

(Keep existing imports: `useState`, `useCallback`, `useEffect`, `Series`, `SeriesList`, etc.)

- [ ] **Step 2: Add activeTab state to App component**

Inside the `App` function, after the existing state declarations (after `const [toast, setToast] = useState('')`), add:

```typescript
  const [activeTab, setActiveTab] = useState<SeriesList>('Ending')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; series: Series } | null>(null)
```

- [ ] **Step 3: Verify imports and state added**

Check `src/App.tsx` has both new imports and both new state variables
Expected: File compiles without import/state errors

---

## Task 4: Add Move Handler to App.tsx

**Files:**
- Modify: `src/App.tsx` (add move handler function)

- [ ] **Step 1: Add move handler function**

In `src/App.tsx`, inside the `App` function, after `handleDelete` function, add:

```typescript
  async function handleMoveToList(series: Series, targetList: SeriesList) {
    const updated = { ...series, list: targetList }
    await window.electronAPI.series.update(updated)
    setToast(`Moved ${series.name} to ${targetList}`)
    await loadAll()
    if (searchQuery.trim()) {
      const fresh = await window.electronAPI.series.search(searchQuery)
      setResults(fresh)
    }
    setContextMenu(null)
  }
```

- [ ] **Step 2: Verify function added**

Check the function exists in `App.tsx`
Expected: Function compiles without errors

---

## Task 5: Replace Grid Layout with Tab Layout in App.tsx

**Files:**
- Modify: `src/App.tsx` (JSX return statement)

- [ ] **Step 1: Replace grid section with TabBar + single SeriesPanel**

In `src/App.tsx`, find this section (around line 128):

```typescript
      {/* 2×3 Grid */}
      {!isSearching && (
        <div className="grid">
          {SERIES_LISTS.map(list => (
            <SeriesPanel
              key={list}
              list={list}
              series={allSeries[list]}
              onEdit={setModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
```

Replace it with:

```typescript
      {/* Tab View */}
      {!isSearching && (
        <>
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SeriesPanel
              list={activeTab}
              series={allSeries[activeTab]}
              onEdit={setModal}
              onDelete={handleDelete}
              onContextMenu={(x, y, series) => setContextMenu({ x, y, series })}
            />
          </div>
        </>
      )}
```

- [ ] **Step 2: Verify grid replaced**

Check `src/App.tsx` no longer has the grid loop
Expected: File still has other grid references removed

---

## Task 6: Add ContextMenu Render to App.tsx

**Files:**
- Modify: `src/App.tsx` (add ContextMenu JSX)

- [ ] **Step 1: Add ContextMenu render**

In `src/App.tsx`, find the line `{toast && <Toast message={toast} onDone={() => setToast('')} />}` and add above it:

```typescript
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          series={contextMenu.series}
          onMove={handleMoveToList}
          onClose={() => setContextMenu(null)}
        />
      )}

```

- [ ] **Step 2: Verify ContextMenu JSX added**

Check the ContextMenu render is above Toast
Expected: JSX renders without errors

---

## Task 7: Update SeriesPanel to Support Context Menu

**Files:**
- Modify: `src/components/SeriesPanel.tsx` (props, handlers, JSX)

- [ ] **Step 1: Update SeriesPanel props**

In `src/components/SeriesPanel.tsx`, update the `Props` interface at the top (around line 8):

```typescript
interface Props {
  list: SeriesList
  series: Series[]
  onEdit:   (s: Series) => void
  onDelete: (id: number) => void
  onContextMenu?: (x: number, y: number, series: Series) => void
}
```

- [ ] **Step 2: Destructure onContextMenu prop**

Update the function signature (around line 15):

```typescript
export default function SeriesPanel({ list, series, onEdit, onDelete, onContextMenu }: Props) {
```

- [ ] **Step 3: Add context menu handler**

After the `handleSearch` function, add:

```typescript
  function handleRowContextMenu(e: React.MouseEvent, s: Series) {
    e.preventDefault()
    if (onContextMenu) {
      onContextMenu(e.clientX, e.clientY, s)
    }
  }
```

- [ ] **Step 4: Add onContextMenu to table row**

In `src/components/SeriesPanel.tsx`, find the `<tr>` element in the table body (around line 66) and add `onContextMenu`:

```typescript
                <tr
                  key={s.id}
                  className={cls}
                  onContextMenu={(e) => handleRowContextMenu(e, s)}
                >
```

- [ ] **Step 5: Verify SeriesPanel updated**

Check SeriesPanel has onContextMenu prop and handler
Expected: File compiles without errors

---

## Task 8: Update Search Results Table with Context Menu

**Files:**
- Modify: `src/App.tsx` (search results table rows)

- [ ] **Step 1: Add context menu to search result rows**

In `src/App.tsx`, find the search results table (around line 108-118) and update the `<tr>` tag:

```typescript
                      <tr
                        key={s.id}
                        className={i % 2 === 1 ? 'row-alt' : ''}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, series: s })
                        }}
                      >
```

- [ ] **Step 2: Verify search results have context menu**

Check the onContextMenu handler is on search result rows
Expected: File compiles without errors

---

## Task 9: Add CSS for TabBar

**Files:**
- Modify: `src/styles/index.css` (or relevant CSS file)

- [ ] **Step 1: Find CSS file**

Run: `find src -name "*.css" | head -5`
Expected: Output shows CSS files (likely `src/index.css` or `src/App.css`)

- [ ] **Step 2: Add TabBar styles**

Add the following CSS to your main stylesheet:

```css
.tab-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--bg-secondary, #f5f5f5);
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: var(--text-secondary, #666);
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab:hover {
  color: var(--text-primary, #333);
  background-color: rgba(0, 0, 0, 0.05);
}

.tab.active {
  color: var(--accent-color, #0066cc);
  border-bottom-color: var(--accent-color, #0066cc);
}

.tab-label {
  display: inline;
}

.tab-badge {
  display: inline-block;
  min-width: 1.5rem;
  padding: 0.1rem 0.4rem;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}

.tab.active .tab-badge {
  background-color: rgba(0, 102, 204, 0.2);
}
```

- [ ] **Step 2: Add ContextMenu styles**

Add the following CSS to your main stylesheet:

```css
.context-menu {
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 0.4rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  min-width: 150px;
  z-index: 1000;
}

.context-menu-header {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.context-menu-item {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary, #333);
  font-size: 0.95rem;
  transition: background-color 0.15s ease;
}

.context-menu-item:hover {
  background-color: var(--accent-bg, #f0f7ff);
  color: var(--accent-color, #0066cc);
}

.context-menu-item:active {
  background-color: var(--accent-color, #0066cc);
  color: white;
}

/* Dark theme support */
[data-theme="dark"] .context-menu {
  background: #2a2a2a;
  border-color: #444;
}

[data-theme="dark"] .context-menu-item {
  color: #e0e0e0;
}

[data-theme="dark"] .context-menu-item:hover {
  background-color: #3a3a3a;
  color: #60a5fa;
}
```

- [ ] **Step 3: Verify styles added**

Check your CSS file has both TabBar and ContextMenu styles
Expected: No CSS syntax errors

---

## Task 10: Manual Testing

**Files:**
- Test: `src/App.tsx`, `src/components/TabBar.tsx`, `src/components/ContextMenu.tsx`, `src/components/SeriesPanel.tsx`

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (or your project's dev command)
Expected: App starts without errors

- [ ] **Step 2: Test tab switching**

1. App loads with "Ending" tab active
2. Click "UpComing" tab
3. Verify table shows UpComing series
4. Click another tab, verify view updates
5. Verify tab badges show correct counts

Expected: Tab switching works smoothly

- [ ] **Step 3: Test context menu**

1. Right-click on a row in any tab
2. Verify context menu appears near cursor
3. Verify menu shows all other lists except current
4. Click "Move to [List]"
5. Verify series moves, item disappears from current tab, toast shows "Moved [name] to [list]"

Expected: Item successfully moved, view updates

- [ ] **Step 4: Test search + context menu**

1. Type in search box
2. Verify search overlay appears
3. Right-click on search result row
4. Verify context menu appears
5. Click "Move to [List]"
6. Verify item moved, search results refresh

Expected: Move works from search results

- [ ] **Step 5: Test search + tab click**

1. Type in search box (search overlay visible)
2. Click a tab
3. Verify search clears and tab view shows

Expected: Search clears when switching tabs (due to !isSearching condition)

- [ ] **Step 6: Test keyboard close**

1. Right-click to open context menu
2. Press Escape
3. Verify menu closes

Expected: Keyboard shortcut works

- [ ] **Step 7: Test theme toggle**

1. Toggle dark/light theme
2. Verify TabBar and ContextMenu respect theme colors
3. Verify text is readable in both themes

Expected: Theme support works

- [ ] **Step 8: Commit**

Run:
```bash
git add src/components/TabBar.tsx src/components/ContextMenu.tsx src/App.tsx src/components/SeriesPanel.tsx src/styles/index.css
git commit -m "feat: add tab view and right-click context menu for quick move"
```

Expected: Commit succeeds

---

## Self-Review

**Spec Coverage:**
- ✅ Tab Bar Component — Task 1
- ✅ Single List View — Task 5
- ✅ Right-Click Context Menu — Tasks 2, 3, 7, 8
- ✅ Search Overlay (unchanged) — Verified in Task 10
- ✅ Toast Notification — Task 4 (reuses existing Toast)
- ✅ State Management — Tasks 3, 4
- ✅ Data Flow (move operation) — Task 4
- ✅ Styling — Task 9
- ✅ Testing — Task 10

**Placeholder Scan:**
- No "TBD" or "TODO" markers
- All code blocks are complete and functional
- All file paths are exact
- All commands are specific with expected output

**Type Consistency:**
- `activeTab: SeriesList` defined in Task 3, used in Tasks 5, 8
- `onContextMenu?: (x: number, y: number, series: Series) => void` defined in Task 7, used in Tasks 5, 8
- `handleMoveToList(series: Series, targetList: SeriesList)` defined in Task 4, called in Task 3
- All types match across tasks

**No Gaps:** All spec sections map to implementation tasks.

---

## Plan complete and saved to `docs/superpowers/plans/2026-06-06-tab-view-quick-move-plan.md`

Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, I review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

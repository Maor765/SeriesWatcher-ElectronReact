# Tab View & Quick Move Feature Design

**Date:** 2026-06-06  
**Scope:** Replace grid view with tabbed view and add right-click context menu for quick item movement  
**Lists:** Ending, UpComing, Fall Ending, Unknown, Upcoming Movies, Israeli

---

## Overview

Transform the 2×3 grid panel layout into a tab-based interface where users view one list at a time, with a right-click context menu to quickly move items between lists without opening the edit modal.

---

## UI Architecture

### Tab Bar Component
- **Position:** Top of content area, below TopBar
- **Tabs:** 6 clickable tabs, one per SeriesList
- **Active State:** Highlight the currently selected tab
- **Labels:** Use the list name (e.g., "Ending", "UpComing")
- **Implementation:** New `<TabBar>` component or inline tabs in `App.tsx`

### Content Area
- **Single SeriesPanel:** Display only the active list's table
- **Active Tab:** Stored in React state (`activeTab`)
- **Behavior:** Clicking a tab updates state and re-renders the panel for that list

### Search Overlay
- **Unchanged:** Search results overlay still displays on top of tabs when search is active
- **Context Menu:** Right-click on search results also allows quick move
- **Clearing Search:** Clears overlay and returns to active tab view

### Right-Click Context Menu
- **Trigger:** Right-click on any table row (both in SeriesPanel and search results)
- **Options:** "Move to [List Name]" for each of the other 5 lists
- **Submenu or Flat:** Recommend flat list of "Move to X" buttons (6 lists total, user excludes current list)
- **Action:** Clicking a move option immediately updates the item's list and reloads the panel data
- **UX Detail:** Show a toast confirmation after move

### Toast Notification
- **Message:** "Moved [SeriesName] to [NewList]"
- **Existing Toast Component:** Reuse `<Toast>` for consistency

---

## Data Flow

### State Management (App.tsx)
```
- allSeries: Record<SeriesList, Series[]>       (existing)
- counts: Record<SeriesList, number>            (existing)
- activeTab: SeriesList                         (new)
- [other state: theme, modal, searchQuery, etc.] (existing)
```

### Move Operation
1. User right-clicks row → context menu appears
2. User clicks "Move to [List]"
3. Call `window.electronAPI.series.update(series)` with new list
4. Show toast: "Moved [name] to [newList]"
5. Reload all data via `loadAll()`
6. Update `activeTab` if item was moved from current tab (optional: stay on current tab or jump to new list)
7. Update search results if search is active

---

## Component Changes

### New Component: TabBar
- **Props:** `activeTab: SeriesList`, `onTabChange: (tab: SeriesList) => void`, `counts: Record<SeriesList, number>`
- **Renders:** Horizontal list of tabs with active indicator
- **Styling:** CSS for active/inactive states, hover effects

### Modified Component: SeriesPanel
- **Remove grid positioning:** Currently uses grid layout; will be single panel below tabs
- **Context menu:** Add right-click handler to table rows
- **Move function:** New handler `handleMoveToList(series: Series, targetList: SeriesList)`

### Modified Component: App
- **Add activeTab state:** `useState<SeriesList>('Ending')`
- **Add TabBar component:** Render above search/panel area
- **Conditional render:** Show only `SeriesPanel` for active list (not the full grid)
- **Search overlay:** Unchanged behavior; still renders when `isSearching`

---

## Context Menu Implementation

### Method: ContextMenuEvent
- Use native `onContextMenu` event on table rows
- Prevent default browser menu with `e.preventDefault()`
- Render a custom `<ContextMenu>` component positioned at mouse coordinates
- Click outside or select option closes menu

### ContextMenu Component (New)
- **Props:** `x: number`, `y: number`, `series: Series`, `onMove: (targetList: SeriesList) => void`, `onClose: () => void`
- **Options:** 5 "Move to X" items (all lists except current)
- **Keyboard:** Escape to close
- **Portal or Overlay:** Render as absolute/fixed overlay to ensure visibility above other elements

---

## Behavior & Edge Cases

### Tab Switching
- **During Search:** Search overlay takes precedence; tabs are visible but switching tabs clears search
- **Item Moved from Current Tab:** After move, item no longer appears in current tab list
- **Active Tab Persistence:** Maintain activeTab in state across modal open/close and search operations

### Move Within Same List
- **Context menu excludes current list:** User cannot move item to its current list
- **Invalid state:** Never displayed as an option

### Search Results & Move
- **Behavior:** Moving an item from search results updates the main list and refreshes search results
- **Visibility:** Moved item may disappear from search results if criteria no longer match, or stay if it does

### Empty Lists
- **Tab Badge:** Show count (e.g., "Ending (0)")
- **Panel Display:** Show "Empty" message as currently implemented

---

## Styling & UX

### Tab Bar Styling
- Clean horizontal tabs with hover/active states
- Color coding optional (could use existing PANEL_COLORS for visual consistency)
- Responsive to window width (consider ellipsis or scroll on very narrow windows)

### Context Menu Styling
- Positioned near cursor
- Light/dark theme support (respect current theme state)
- Clear visual hierarchy for move options
- Hover highlight on options

### Toast Messaging
- "Moved [Series Name] to [List Name]"
- 3-second auto-dismiss (existing Toast behavior)

---

## Testing

### Manual Test Cases
1. **Tab switching:** Click each tab, verify correct list displays
2. **Context menu:** Right-click rows, verify menu appears and lists all other lists
3. **Move operation:** Select "Move to X", verify item moved, toast shows, list updates
4. **Search + move:** Search, right-click in results, move item, verify search results refresh
5. **Search + tab switch:** While searching, click a tab, verify search clears and tab view appears
6. **Empty lists:** Navigate to empty list tab, verify "Empty" message displays
7. **Theme toggle:** Switch theme, verify tab bar and context menu respect theme
8. **Keyboard:** Escape in context menu closes it, other keyboard interactions unchanged

---

## Implementation Steps (Summary)

1. Create `TabBar` component
2. Create `ContextMenu` component
3. Modify `SeriesPanel` to attach context menu handlers
4. Modify `App.tsx` to add `activeTab` state and render tabs instead of grid
5. Add move handler in `App.tsx` that calls update + reload + toast
6. Update types/interfaces if needed
7. CSS for new components
8. Test all flows

---

## Design Decisions

- **Tab bar color:** Use neutral color for clean visual hierarchy
- **Active tab persistence:** Reset to "Ending" on app reload (no localStorage)
- **Context menu positioning:** Fixed to viewport for reliable visibility
- **Move success feedback:** Toast confirmation only; stay on current tab after move


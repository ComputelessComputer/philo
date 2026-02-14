# Philo — Architecture & Implementation Plan

## Overview
Philo is a **daily journaling app** with a **LogSeq-style timeline view** (newest day on top, scroll back in time). Core features:
- **Timeline journal** — one note per day, newest at top with minimum height
- **Auto task rollover** — unchecked to-dos from previous days automatically carry forward to today
- **AI widget generation** (unique feature) — hit **Shift+Cmd+Enter** to generate custom React mini-apps embedded inline

## Stack
- **Desktop shell**: Tauri v2
- **Frontend**: Vite + React 18 + TypeScript
- **Editor**: TipTap (ProseMirror-based) with custom node extensions
- **Styling**: Tailwind CSS
- **Widget rendering**: Sandboxed iframes
- **AI**: OpenAI / Anthropic API (user-configurable)
- **Storage**: Tauri `fs` plugin → local filesystem

## Obsidian Plugin System (Reference)
We're borrowing from Obsidian's extension architecture:
- Each plugin lives in `.obsidian/plugins/<plugin-id>/`
- Contains: `manifest.json` (metadata), `main.js` (logic), `data.json` (settings/state), `styles.css` (optional)
- Settings persisted via `loadData()`/`saveData()` to `data.json`

**What we adopt:**
- Per-widget isolation — each widget gets its own directory with manifest + code + state
- JSON-based config — all widget metadata and state stored as JSON files
- Simple lifecycle — load → render → save state → unload

## Storage Model

```
$APPDATA/philo/
  journal/
    2026-02-14.json             # Daily note (TipTap JSON + task metadata)
    2026-02-13.json
    2026-02-12.json
    ...
  widgets/
    <widget-id>/
      manifest.json             # { id, name, description, prompt, createdAt, updatedAt }
      component.tsx             # AI-generated React component source
      state.json                # Widget-specific persistent state
  library.json                  # Index of saved widgets: [{ id, name, description }]
```

### Daily Note Structure
Each daily note is stored as JSON with TipTap content + task metadata:
```json
{
  "date": "2026-02-14",
  "content": { /* TipTap JSON document */ },
  "tasks": [
    { "id": "task-abc", "text": "Buy groceries", "checked": false, "originDate": "2026-02-13" },
    { "id": "task-def", "text": "Call dentist", "checked": false, "originDate": "2026-02-14" }
  ]
}
```

`originDate` tracks when the task was originally created. Tasks with `checked: false` automatically roll forward to the next day.

### Widget Node in TipTap JSON
```json
{
  "type": "widget",
  "attrs": {
    "widgetId": "calorie-tracker-a1b2c3",
    "prompt": "Build me a calorie tracker",
    "source": "inline",
    "config": {}
  }
}
```

`source`: `"inline"` (disposable, config in document) or `"library"` (persisted to `widgets/` directory).

## Widget Rendering

AI-generated code is sandboxed for safety:

1. AI generates a React component as TSX
2. Transpiled client-side using **Sucrase** (lightweight JSX/TS transpiler)
3. Injected into a **sandboxed iframe** with a minimal React runtime
4. iframe ↔ host communication via `postMessage`:
   - State read/write
   - Theme info (dark/light)
   - Resize events

## TipTap Integration

Custom `WidgetNode` extension:
- Block-level node (`group: 'block'`)
- `Shift-Mod-Enter` keyboard shortcut inserts a widget block
- `ReactNodeViewRenderer(WidgetBlockComponent)` renders the node view
- States: prompt input → loading → rendered widget → error

Node attributes: `widgetId`, `prompt`, `source`, `config`, `code` (for inline widgets).

## Core User Flows

### Daily Journaling
1. User opens app → today's note is shown at the top of the timeline
2. User writes notes, creates task lists (using TipTap's task list extension)
3. At end of day, unchecked tasks are **automatically carried forward** to tomorrow's note
4. User scrolls down to see previous days' entries (each with date header)
5. Each day has a minimum height to preserve visual rhythm

### AI Widget Generation
1. User hits **Shift+Cmd+Enter** while editing a daily note → empty widget block inserted
2. User types a prompt (e.g. "calorie tracker with daily goals")
3. User hits **Enter** or clicks Generate → AI call fires
4. AI returns React component → transpiled → rendered in sandboxed iframe
5. Widget is **disposable by default** — stored in that day's TipTap document
6. **"Save to Library"** → persists to `widgets/<id>/`, updates `library.json`
7. Library panel lets user insert saved widgets into any daily note

### Task Rollover Logic
**At midnight (or when opening the app on a new day):**
1. Scan previous day's note for unchecked task items
2. Create copies in today's note with `originDate` preserved
3. Mark them visually as "rolled over from [date]" (subtle badge/indicator)

## Project Structure

```
philo/
  src/
    components/
      journal/
        TimelineView.tsx              # Scrollable timeline of daily notes
        DailyNote.tsx                 # Single day's note editor
        TaskItem.tsx                  # Task list item with rollover indicator
      editor/
        Editor.tsx                    # TipTap editor wrapper
        extensions/
          widget-node/
            WidgetNode.ts             # TipTap node extension
            WidgetBlock.tsx           # React node view component
            WidgetSandbox.tsx         # Iframe sandbox renderer
            WidgetPrompt.tsx          # Prompt input UI
          task-item/
            TaskItemNode.ts           # Custom task item extension with rollover tracking
      library/
        LibraryPanel.tsx              # Sidebar listing saved widgets
        LibraryItem.tsx               # Single library entry
      layout/
        AppLayout.tsx                 # Sidebar + timeline layout
    services/
      ai.ts                           # AI API client
      storage.ts                      # Tauri fs wrapper (daily notes)
      transpiler.ts                   # Sucrase TSX → JS
      tasks.ts                        # Task rollover logic
    types/
      widget.ts                       # Widget, Manifest, LibraryEntry
      note.ts                         # DailyNote, Task types
    App.tsx
    main.tsx
  src-tauri/
    src/
      main.rs
      lib.rs
    tauri.conf.json
    Cargo.toml
```

## Implementation Phases

### Phase 1: Project Scaffolding ✅
- ✅ Initialize Tauri v2 + Vite + React + TypeScript
- ✅ Set up Tailwind CSS
- ✅ Basic app layout (sidebar + editor area)
- ✅ TipTap with StarterKit

### Phase 2: Daily Journal Timeline (CURRENT)
- Timeline view component (scrollable, newest on top)
- Daily note component with date header
- Daily note storage (one JSON file per day in `journal/`)
- Auto-create today's note if it doesn't exist
- Navigate between days (scroll or date picker)

### Phase 3: Task Rollover System
- Custom TaskItem TipTap extension (extends task list)
- Track task metadata (id, originDate, checked)
- Task rollover service (scan previous days, copy unchecked tasks)
- Visual indicator for rolled-over tasks ("from Feb 13")
- Run rollover on app start + at midnight

### Phase 4: Widget Node Extension
- `WidgetNode` TipTap extension
- `Shift+Cmd+Enter` shortcut
- Prompt input UI within widget block
- `WidgetSandbox` iframe renderer
- Sucrase transpiler integration

### Phase 5: AI Integration
- AI service layer (configurable API key + provider)
- Prompt → React component generation
- System prompt engineering
- Streaming + loading states

### Phase 6: Widget Persistence & Library
- Widget storage model (manifest, component, state files)
- "Save to Library" flow
- Library sidebar panel
- Insert saved widgets from library

### Phase 7: Polish
- Widget state persistence (postMessage bridge)
- Error handling / retry
- Dark/light theme
- Widget resize handles
- Settings panel (API keys, preferences)

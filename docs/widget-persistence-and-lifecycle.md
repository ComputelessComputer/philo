# Widget Persistence And Lifecycle

This document is the implementation reference for how Philo stores widgets, updates them, saves them to the library, and tracks revisions.

If you are changing widget behavior, start here before editing the code. The goal is to avoid re-deriving the persistence model from `WidgetView.tsx`, `widget-files.ts`, and `library.ts` every time.

## Scope

This covers the desktop app widget flow implemented in:

- `apps/desktop/src/services/widget-files.ts`
- `apps/desktop/src/services/library.ts`
- `apps/desktop/src/components/editor/extensions/widget/WidgetExtension.ts`
- `apps/desktop/src/components/editor/extensions/widget/WidgetView.tsx`
- `apps/desktop/src/components/editor/EditorBubbleMenu.tsx`
- `apps/desktop/src/components/layout/AppLayout.tsx`

## Storage Layers

Philo widgets exist in four related layers:

1. Note content
   The note stores a widget embed like `![[widgets/<slug>-<id>.widget.md]]`.
2. Widget file
   The actual widget state lives in an individual `.widget.md` file under the resolved `widgets/` directory.
3. Widget instance storage
   If the widget has generated persistent storage, it also gets a sidecar SQLite database next to the widget file.
4. Library entry
   If the widget is archived to the library, it also gets a stable library entry and may get a shared component record.

The important rule is:

- The widget file is the source of truth for the current widget prompt, runtime payload, saved state, and revision history.
- Unsaved widgets use file-scoped state and, when needed, a sibling SQLite sidecar.
- Archived library widgets reuse the archived widget file when that canonical file is known, so repeated library inserts share that file's state.

## Files On Disk

### Widget files

Widget files live at:

- vault mode: `<vaultDir>/widgets/`
- default mode: `<journalDir>/widgets/`

Filename format:

```text
<slug>-<widget-id>.widget.md
```

### Library files

Library files live at:

- vault mode: `<vaultDir>/library/`
- default mode: `<journalDir>/library/`

Legacy non-shared library filename format:

```text
<slug>-<library-item-id>.component.md
```

Shared library entries are also backed by shared component manifests managed through `library.ts`.

## Widget File Schema

The in-memory shape in `widget-files.ts` is:

```ts
interface WidgetRevisionRecord {
  id: string;
  createdAt: string;
  prompt: string;
  spec: string;
}

interface WidgetFileRecord {
  id: string;
  title: string;
  prompt: string;
  runtime: "json" | "code";
  favorite: boolean;
  saved: boolean;
  spec: string;
  source: string;
  currentRevisionId: string;
  revisions: WidgetRevisionRecord[];
  libraryItemId?: string | null;
  componentId?: string | null;
  storageSchema?: SharedStorageSchema | null;
  file: string;
  path: string;
}
```

Field meaning:

- `id`
  Stable widget file identity.
- `title`
  Display title derived from the prompt.
- `prompt`
  The current persisted widget prompt.
- `runtime`
  The active widget runtime. New widgets use `code`.
- `favorite`
  Favorite state mirrored into the library drawer.
- `saved`
  Whether this widget is currently linked to a library entry.
- `spec`
  Legacy JSON payload for old widgets.
- `source`
  The current TSX widget source used by the code-widget runtime.
- `currentRevisionId`
  Pointer to the active revision in `revisions`.
- `revisions`
  Append-only revision snapshots for checkpoint/rollback support.
- `libraryItemId`
  Stable link to the library item that owns this widget, when archived.
- `componentId`
  Stable link to the shared component manifest for reusable widget templates.
- `storageSchema`
  Generated storage contract for this widget instance. When non-empty, it powers the widget's sidecar SQLite database.
- `file`
  Note embed target, usually `widgets/<filename>.widget.md`.
- `path`
  Absolute filesystem path.

## Widget Markdown Format

Each widget file is plain markdown with frontmatter-style metadata, the current runtime payload, optional storage metadata, and an internal history block.

Example:

````md
---
id: "widget-uuid"
title: "Raffle"
prompt: "Build a raffle widget"
runtime: "code"
saved: true
libraryItemId: "library-item-uuid"
componentId: "shared-component-uuid"
---

```tsx widget
export default function Widget() {
  const [entries, setEntries,] = Philo.useWidgetState("entries", [],);

  return (
    <div style={{ padding: 16, }}>
      <button
        onClick={() => setEntries((current,) => [...current, { id: crypto.randomUUID(), label: "New entry", },])}
      >
        Add entry
      </button>
      <ul>
        {entries.map((entry,) => <li key={entry.id}>{entry.label}</li>)}
      </ul>
    </div>
  );
}
```

```json widget-storage
{
  "tables": [
    {
      "name": "items",
      "columns": [
        { "name": "id", "type": "integer", "primaryKey": true },
        { "name": "title", "type": "text", "notNull": true }
      ]
    }
  ],
  "namedQueries": [],
  "namedMutations": []
}
```

```json widget-history
{
  "currentRevisionId": "revision-uuid-2",
  "revisions": [
    {
      "id": "revision-uuid-1",
      "createdAt": "2026-03-17T08:00:00.000Z",
      "prompt": "Build a raffle widget",
      "spec": "export default function Widget() { return <div />; }"
    },
    {
      "id": "revision-uuid-2",
      "createdAt": "2026-03-17T08:05:00.000Z",
      "prompt": "Build a raffle widget with a winner area",
      "spec": "export default function Widget() { return <div>Winner area</div>; }"
    }
  ]
}
```
````

Notes:

- New widgets store their runtime payload in a `tsx widget` block.
- Legacy widgets may still carry a plain `json` block until rebuilt.
- The optional `json widget-storage` block is the instance storage schema. If it contains tables, Philo creates a sibling `.widget.sqlite3` file for that widget instance.
- The `json widget-history` block is the internal checkpoint log.
- Older widget files without a history block are migrated lazily when rewritten.

## Note Serialization Format

When a note is saved, the widget node prefers writing an embed:

```md
![[widgets/raffle-<id>.widget.md]]
```

When a note is loaded, `resolveWidgetEmbeds()` reads the widget file and replaces the embed with a `data-widget` HTML placeholder for the editor runtime.

That runtime placeholder carries:

- `data-id`
- `data-storage-id`
- `data-file`
- `data-path`
- `data-prompt`
- `data-runtime`
- `data-source` for code widgets
- `data-spec` only for legacy JSON widgets
- `data-storage-schema`
- `data-saved`
- `data-library-item-id`
- `data-component-id`

`data-id` is the per-node editor identity. `data-storage-id` is the stable widget file identity used for widget storage and file rewrites. Multiple embeds can therefore share one widget file without sharing editor event state.

## Build And Update Procedures

### 1. Create a new widget

Entry points:

- selection bubble menu `Build`
- `Mod-Shift-B`

For a new AI-generated widget:

1. Insert a temporary widget node in the editor with `loading: true`.
2. Generate TSX widget source and storage schema together.
3. Create a new `.widget.md` file through `createWidgetFile()`.
4. If the storage schema is non-empty, create the widget's sidecar SQLite file.
5. Persist the first revision automatically.
6. Replace the temporary node attrs with the real file-backed widget record.

### 2. Rebuild an existing widget

Entry point:

- toolbar refresh button

Flow:

1. `WidgetView` builds a generation prompt from the saved widget prompt plus the current widget source.
2. The existing widget stays visible in the note.
3. The widget body gets an in-place build overlay.
4. The new source and storage schema are generated together.
5. Existing widgets with a storage schema must keep that schema unchanged.
6. `persistWidgetRecord()` rewrites the widget file.
7. A new revision is appended if the prompt/source changed.

### 3. Edit a widget through chat

Entry point:

- toolbar pencil button

Flow:

1. `WidgetView` requests a widget edit session.
2. `AppLayout` opens the AI composer with `[Edit widget] <title>`.
3. The user submits an edit instruction.
4. `WidgetView` turns that instruction into a generation prompt that includes:
   - the persisted widget prompt
   - the current widget source
   - the requested change
5. The widget rebuilds in place.
6. The resulting prompt/source pair is persisted and appended as a new revision.

The important distinction is:

- the generation prompt can include the current source and the edit instruction
- the persisted prompt stays the canonical widget prompt stored on disk

### 4. Archive a widget to the library

Entry point:

- toolbar archive button on an inline widget

Flow:

1. `WidgetView.handleSave()` archives the current code widget with storage metadata.
2. `addToLibrary()` creates the shared component manifest entry for the library drawer.
3. The widget file is rewritten with:
   - `saved: true`
   - `libraryItemId`
   - `componentId`
   - the widget instance's `storageSchema`
4. The editor node is updated to match the rewritten widget file.

### 5. Insert a widget from the library

Entry point:

- Library drawer

Flow:

1. `loadLibrary()` returns library items backed by saved widget files, plus shared component metadata and legacy fallbacks when needed.
2. If the chosen library item already has canonical widget file metadata (`file`, `path`, `storageId`), `AppLayout` inserts a new widget node that points at that existing widget file.
3. The inserted node gets a fresh editor `id`, but keeps the archived widget's `storageId`, `file`, `path`, `libraryItemId`, and `componentId`.
4. If the library item does not have canonical widget file metadata, `AppLayout` falls back to creating a new widget file from the library item.

The normal archived-widget path now reuses the archived widget file, so repeated inserts share the same file-backed state and the same widget-sidecar SQLite database.

### 6. Remove a library item

Entry point:

- Library drawer delete action

Flow:

1. `removeFromLibrary()` removes the library entry.
2. `markWidgetLibraryReferenceRemoved()` scans widget files.
3. Matching widget files have their library link cleared:
   - `saved: false`
   - `libraryItemId: null`
   - `componentId: null` when it matched the removed shared component

This keeps note widgets and library state from drifting.

## Revision Tracking Rules

Philo uses internal widget revisions, not Git, for widget checkpoints.

Current rules:

- Every new widget starts with one revision.
- Every rebuild or chat edit that changes prompt/source appends one new revision.
- Saving to library also appends a revision if it changes the persisted widget record.
- If a rewrite does not materially change the prompt/source pair, no duplicate revision is appended.

Current limitation:

- The persistence layer supports checkpoints, but there is not yet a UI for browsing or restoring older revisions.

## Operational Invariants

When changing widget code, preserve these invariants:

- The widget file stays the canonical source of truth.
- `saved` alone is not enough to identify library linkage. Use `libraryItemId`.
- `componentId` identifies the reusable template, while `storageId` identifies the concrete widget file used for file-backed state.
- Editor node ids and widget storage ids are intentionally different.
- Revisions are append-only snapshots of prompt/source state.
- Removing a library entry must clear saved/library references from widget files.
- Note markdown should keep storing widget embeds, not inline giant payloads.

## Practical Change Checklist

If you touch widget persistence, verify:

- widget create still writes a `.widget.md` file
- note save/load still round-trips widget embeds
- rebuild/edit still append revisions
- save-to-library still writes `saved`, `libraryItemId`, and `componentId`
- library insert reuses the canonical widget file when present
- library delete still clears matching widget files
- old widget files without history still load and rewrite correctly

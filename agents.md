# Agents

## Project Overview

Philo is a daily journaling desktop app that lets users generate custom React mini-apps (widgets) inline via AI. Built with Tauri v2, React 19, TypeScript, TipTap, and Tailwind CSS v4.

## Stack

- **Desktop shell**: Tauri v2 (Rust backend)
- **Frontend**: Vite 7 + React 19 + TypeScript 5.8
- **Editor**: TipTap (ProseMirror-based) with custom extensions
- **Styling**: Tailwind CSS v4 + `@tailwindcss/typography`
- **Package manager**: bun
- **Storage**: Tauri `fs` plugin → local filesystem (`$APPDATA/philo/`)

## Commands

- `bun run dev` — Start Vite dev server
- `bun run build` — TypeScript check + Vite build
- `bun run tauri dev` — Run full Tauri app in dev mode
- `bun run tauri build` — Production build
- `bun run typecheck` — Run TypeScript type checking (`tsc --noEmit`)
- `bun run fmt` — Format code with dprint
- `bun run fmt:check` — Check formatting without writing (CI)
- `bun run check` — Run typecheck + format (`bun run typecheck && dprint fmt`)
- `cargo fmt --manifest-path src-tauri/Cargo.toml` — Format Rust code

## Project Structure

```
src/
  components/
    journal/       # Timeline view, daily notes, editable/past notes
    editor/        # TipTap editor wrapper
    layout/        # App layout (sidebar + timeline)
  services/
    storage.ts     # Tauri fs wrapper for daily notes
    tasks.ts       # Task rollover logic
  types/
    note.ts        # DailyNote, Task types
  App.tsx
  main.tsx
src-tauri/         # Rust backend (Tauri v2)
```

## Architecture Notes

- One JSON file per day stored in `$APPDATA/philo/journal/` (e.g. `2026-02-14.json`)
- Daily notes contain TipTap JSON content + task metadata
- Tasks have `originDate` tracking for rollover — unchecked tasks carry forward to the next day
- Widget rendering uses sandboxed iframes with Sucrase for client-side TSX transpilation
- Widgets communicate with host via `postMessage` (state, theme, resize)

## Conventions

- Use TypeScript strict mode
- Use Tailwind CSS utility classes for styling
- Use `nanoid` for generating unique IDs
- Fonts: Instrument Serif (headings), IBM Plex Mono (monospace)
- Keep components small and focused; split into `journal/`, `editor/`, `layout/` directories
- Storage operations go through `services/storage.ts`

## Current Phase

Phase 2: Daily Journal Timeline — implementing timeline view, daily note storage, and navigation.

## Pre-commit checks

Always run formatting and type checks before committing:

- `bun run check` — runs TypeScript typecheck and formats with dprint (writes changes)
- For verification-only/CI: `bun run fmt:check`
- If you changed Rust code: `cargo fmt --manifest-path src-tauri/Cargo.toml`

Typical commit flow:

1. `bun run check`
2. `git add -A`
3. `git commit -m "..."`

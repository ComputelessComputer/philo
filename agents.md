# Agents

## Commit Discipline

- Commit after every discrete action. Each meaningful change (e.g. adding a feature, fixing a bug, refactoring, updating docs, adding a test) must be committed individually before moving on.
- Use concise, imperative commit messages (e.g. `add task rollover logic`, `fix off-by-one in timeline view`).
- Do not batch unrelated changes into a single commit.
- If a task involves multiple steps, commit after each step — not all at the end.
- Include `Co-Authored-By: Warp <agent@warp.dev>` at the end of every commit message.

## Pre-commit Checks

- Run `bun run check` (typecheck + dprint format) before every commit.
- If you changed Rust code, also run `cargo fmt --manifest-path src-tauri/Cargo.toml`.
- Run `bun run build` after code changes to verify compilation before committing.

Typical commit flow:

1. `bun run check`
2. `git add -A`
3. `git commit -m "..."`

## Releases

- When asked to create a release: bump the version in `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`, commit, push, then create the release with `gh release create`.
- Releases must be published immediately — do not use `--draft`.
- Include release notes with concise, descriptive bullet points explaining what changed (e.g. `- Add task rollover for unchecked items`). Do not just list version numbers or raw commit messages.
- Each bullet should describe the user-facing change, not implementation details.

## General

- Keep commits small and reviewable.
- Use TypeScript strict mode.
- Use Tailwind CSS utility classes for styling.
- Storage operations go through `services/storage.ts`.
- Keep components small and focused; split into `journal/`, `editor/`, `layout/` directories.

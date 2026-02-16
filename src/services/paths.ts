import { appDataDir, homeDir, join, dirname } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { getJournalDirSetting, getFilenamePattern } from './settings';

let resolvedBaseDir: string | null = null;
let resolvedJournalDir: string | null = null;

/**
 * Base directory for all app data.
 * - Dev:  ~/Library/Application Support/com.philo.dev/
 * - Prod: ~/Library/Application Support/philo/ (Tauri AppData)
 */
export async function getBaseDir(): Promise<string> {
  if (resolvedBaseDir) return resolvedBaseDir;

  if (import.meta.env.DEV) {
    const home = await homeDir();
    resolvedBaseDir = await join(home, 'Library', 'Application Support', 'com.philo.dev');
  } else {
    resolvedBaseDir = await appDataDir();
  }
  return resolvedBaseDir;
}

/**
 * Returns the journal directory. Uses the custom path from settings if set,
 * otherwise falls back to `{baseDir}/journal/`.
 */
export async function getJournalDir(): Promise<string> {
  if (resolvedJournalDir) return resolvedJournalDir;

  const customDir = await getJournalDirSetting();
  if (customDir) {
    resolvedJournalDir = customDir;
  } else {
    const base = await getBaseDir();
    resolvedJournalDir = await join(base, 'journal');
  }
  return resolvedJournalDir;
}

/**
 * Clear cached journal dir so it's re-read from settings on next access.
 * Also extends the FS & asset protocol scopes for the new path.
 */
export async function resetJournalDir(newDir?: string): Promise<void> {
  resolvedJournalDir = null;
  if (newDir) {
    await invoke('extend_fs_scope', { path: newDir });
  }
}

/**
 * Extend FS scope for the current journal dir on app startup.
 * Call once from the app root.
 */
export async function initJournalScope(): Promise<void> {
  const customDir = await getJournalDirSetting();
  if (customDir) {
    await invoke('extend_fs_scope', { path: customDir });
  }
}

export async function getAssetsDir(): Promise<string> {
  const journal = await getJournalDir();
  return await join(journal, 'assets');
}

/**
 * Apply a filename pattern to a date string (YYYY-MM-DD).
 * Supported tokens: {YYYY}, {MM}, {DD}
 * Example: "{YYYY}/{YYYY}-{MM}-{DD}" → "2026/2026-02-16"
 */
export function applyFilenamePattern(pattern: string, date: string): string {
  const [yyyy, mm, dd] = date.split('-');
  return pattern
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{DD\}/g, dd);
}

/**
 * Get the full file path for a daily note, applying the filename pattern.
 */
export async function getNotePath(date: string): Promise<string> {
  const journalDir = await getJournalDir();
  const pattern = await getFilenamePattern();
  const relativePath = applyFilenamePattern(pattern, date) + '.md';
  return await join(journalDir, relativePath);
}

/**
 * Get the parent directory of a note path (for ensuring subdirectories exist).
 */
export async function getNoteDir(date: string): Promise<string> {
  const notePath = await getNotePath(date);
  return await dirname(notePath);
}

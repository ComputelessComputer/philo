import { appDataDir, homeDir, join } from '@tauri-apps/api/path';

let resolvedBaseDir: string | null = null;

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

export async function getJournalDir(): Promise<string> {
  const base = await getBaseDir();
  return await join(base, 'journal');
}

export async function getAssetsDir(): Promise<string> {
  const journal = await getJournalDir();
  return await join(journal, 'assets');
}

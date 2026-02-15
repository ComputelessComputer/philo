import { 
  exists, 
  mkdir, 
  readTextFile, 
  writeTextFile,
  BaseDirectory 
} from '@tauri-apps/plugin-fs';
import { DailyNote, getDaysAgo } from '../types/note';

const JOURNAL_DIR = 'journal';

async function ensureJournalDir() {
  const dirExists = await exists(JOURNAL_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(JOURNAL_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

export async function saveDailyNote(note: DailyNote): Promise<void> {
  await ensureJournalDir();
  const filename = `${JOURNAL_DIR}/${note.date}.json`;
  await writeTextFile(filename, JSON.stringify(note.content), { baseDir: BaseDirectory.AppData });
}

export async function loadDailyNote(date: string): Promise<DailyNote | null> {
  await ensureJournalDir();
  const filename = `${JOURNAL_DIR}/${date}.json`;
  const fileExists = await exists(filename, { baseDir: BaseDirectory.AppData });
  
  if (!fileExists) {
    return null;
  }
  
  const raw = await readTextFile(filename, { baseDir: BaseDirectory.AppData });
  const content = JSON.parse(raw);
  return { date, content };
}

export async function createEmptyDailyNote(date: string): Promise<DailyNote> {
  const note: DailyNote = {
    date,
    content: { type: 'doc', content: [] },
  };
  
  await saveDailyNote(note);
  return note;
}

export async function getOrCreateDailyNote(date: string): Promise<DailyNote> {
  const existing = await loadDailyNote(date);
  if (existing) {
    return existing;
  }
  return createEmptyDailyNote(date);
}

/**
 * Load existing past notes (does NOT create missing ones).
 * Checks the past `days` days and returns only notes that exist on disk.
 */
export async function loadPastNotes(days: number = 30): Promise<DailyNote[]> {
  const results = await Promise.all(
    Array.from({ length: days }, (_, i) => loadDailyNote(getDaysAgo(i + 1)))
  );
  return results.filter((note): note is DailyNote => note !== null);
}

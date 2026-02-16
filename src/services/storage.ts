import { 
  exists, 
  mkdir, 
  readTextFile, 
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { DailyNote, getDaysAgo } from '../types/note';
import { resolveMarkdownImages, unresolveMarkdownImages } from './images';
import { getNotePath, getNoteDir } from './paths';

async function ensureDir(dir: string) {
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir, { recursive: true });
  }
}

export async function saveDailyNote(note: DailyNote): Promise<void> {
  const noteDir = await getNoteDir(note.date);
  await ensureDir(noteDir);
  const filepath = await getNotePath(note.date);
  // Convert asset:// URLs back to relative paths before writing
  const markdown = unresolveMarkdownImages(note.content);
  await writeTextFile(filepath, markdown);
}

export async function loadDailyNote(date: string): Promise<DailyNote | null> {
  const filepath = await getNotePath(date);
  const fileExists = await exists(filepath);
  
  if (!fileExists) {
    return null;
  }
  
  const raw = await readTextFile(filepath);
  // Convert relative asset paths to asset:// URLs for display
  const content = await resolveMarkdownImages(raw);
  return { date, content };
}

export async function createEmptyDailyNote(date: string): Promise<DailyNote> {
  const note: DailyNote = {
    date,
    content: '',
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

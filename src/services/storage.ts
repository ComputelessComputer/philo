import { 
  exists, 
  mkdir, 
  readTextFile, 
  writeTextFile,
  BaseDirectory 
} from '@tauri-apps/plugin-fs';
import { DailyNote } from '../types/note';

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
  const content = JSON.stringify(note, null, 2);
  await writeTextFile(filename, content, { baseDir: BaseDirectory.AppData });
}

export async function loadDailyNote(date: string): Promise<DailyNote | null> {
  await ensureJournalDir();
  const filename = `${JOURNAL_DIR}/${date}.json`;
  const fileExists = await exists(filename, { baseDir: BaseDirectory.AppData });
  
  if (!fileExists) {
    return null;
  }
  
  const content = await readTextFile(filename, { baseDir: BaseDirectory.AppData });
  return JSON.parse(content) as DailyNote;
}

export async function createEmptyDailyNote(date: string): Promise<DailyNote> {
  const note: DailyNote = {
    date,
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    },
    tasks: [],
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

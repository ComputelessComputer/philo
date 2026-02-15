import { exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { getBaseDir } from './paths';

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  html: string;
  prompt: string;
  savedAt: string;
}

const LIBRARY_FILE = 'library.json';

async function getLibraryPath(): Promise<string> {
  const base = await getBaseDir();
  return await join(base, LIBRARY_FILE);
}

export async function loadLibrary(): Promise<LibraryItem[]> {
  const path = await getLibraryPath();
  const fileExists = await exists(path);
  if (!fileExists) return [];

  try {
    const raw = await readTextFile(path);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveLibrary(items: LibraryItem[]): Promise<void> {
  const base = await getBaseDir();
  const dirExists = await exists(base);
  if (!dirExists) {
    await mkdir(base, { recursive: true });
  }
  const path = await join(base, LIBRARY_FILE);
  await writeTextFile(path, JSON.stringify(items, null, 2));
}

export async function addToLibrary(item: Omit<LibraryItem, 'id' | 'savedAt'>): Promise<LibraryItem> {
  const items = await loadLibrary();
  const newItem: LibraryItem = {
    ...item,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  await saveLibrary(items);
  return newItem;
}

export async function removeFromLibrary(id: string): Promise<void> {
  const items = await loadLibrary();
  await saveLibrary(items.filter((item) => item.id !== id));
}

import { exists, mkdir, readTextFile, writeTextFile, } from "@tauri-apps/plugin-fs";
import { DailyNote, getDaysAgo, } from "../types/note";
import { resolveMarkdownImages, unresolveMarkdownImages, } from "./images";
import { getNoteDir, getNotePath, } from "./paths";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function parseFrontmatter(raw: string,): { city: string | null; body: string; } {
  const match = raw.match(FRONTMATTER_RE,);
  if (!match) return { city: null, body: raw, };
  const cityMatch = match[1].match(/^city:\s*(.+)$/m,);
  return {
    city: cityMatch ? cityMatch[1].trim() : null,
    body: raw.slice(match[0].length,),
  };
}

function buildFrontmatter(city: string | null | undefined, body: string,): string {
  if (!city) return body;
  return `---\ncity: ${city}\n---\n${body}`;
}

async function ensureDir(dir: string,) {
  const dirExists = await exists(dir,);
  if (!dirExists) {
    await mkdir(dir, { recursive: true, },);
  }
}

export async function saveDailyNote(note: DailyNote,): Promise<void> {
  const noteDir = await getNoteDir(note.date,);
  await ensureDir(noteDir,);
  const filepath = await getNotePath(note.date,);
  let body = unresolveMarkdownImages(note.content,);
  if (!body.endsWith("\n",)) body += "\n";
  await writeTextFile(filepath, buildFrontmatter(note.city, body,),);
}

export async function loadDailyNote(date: string,): Promise<DailyNote | null> {
  const filepath = await getNotePath(date,);
  const fileExists = await exists(filepath,);

  if (!fileExists) {
    return null;
  }

  const raw = await readTextFile(filepath,);
  const { city, body, } = parseFrontmatter(raw,);
  const content = await resolveMarkdownImages(body,);
  return { date, content, city, };
}

export async function createEmptyDailyNote(date: string,): Promise<DailyNote> {
  const note: DailyNote = {
    date,
    content: "",
  };

  await saveDailyNote(note,);
  return note;
}

export async function getOrCreateDailyNote(date: string,): Promise<DailyNote> {
  const existing = await loadDailyNote(date,);
  if (existing) {
    return existing;
  }
  return createEmptyDailyNote(date,);
}

/**
 * Load existing past notes (does NOT create missing ones).
 * Checks the past `days` days and returns only notes that exist on disk.
 */
export async function loadPastNotes(days: number = 30,): Promise<DailyNote[]> {
  const results = await Promise.all(
    Array.from({ length: days, }, (_, i,) => loadDailyNote(getDaysAgo(i + 1,),),),
  );
  return results.filter((note,): note is DailyNote => note !== null);
}

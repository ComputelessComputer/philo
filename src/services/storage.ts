import { exists, mkdir, readTextFile, writeTextFile, } from "@tauri-apps/plugin-fs";
import { DailyNote, getDaysAgo, } from "../types/note";
import { resolveMarkdownImages, unresolveMarkdownImages, } from "./images";
import { getNoteDir, getNotePath, } from "./paths";

async function ensureDir(dir: string,) {
  const dirExists = await exists(dir,);
  if (!dirExists) {
    await mkdir(dir, { recursive: true, },);
  }
}

/**
 * Strip &nbsp; entities that TipTap's markdown serializer produces for
 * empty paragraphs / list items. Left in the file they render as literal
 * text on reload.
 */
function stripNbsp(markdown: string,): string {
  return markdown.replace(/&nbsp;/g, "",);
}

const ZWSP = "\u200B";

/**
 * Convert blank lines in markdown into zero-width-space paragraphs so
 * TipTap renders them as visible empty lines in the editor.
 */
function preserveBlankLines(markdown: string,): string {
  return markdown.trimEnd().replace(/\n{2,}/g, `\n\n${ZWSP}\n\n`,);
}

/**
 * Normalize serialized markdown for writing to disk:
 * strip ZWSP characters and collapse runs of 3+ newlines back to 2.
 */
function normalizeForSave(markdown: string,): string {
  return markdown.replace(/\u200B/g, "",).replace(/\n{3,}/g, "\n\n",);
}

export async function saveDailyNote(note: DailyNote,): Promise<void> {
  const noteDir = await getNoteDir(note.date,);
  await ensureDir(noteDir,);
  const filepath = await getNotePath(note.date,);
  // Convert asset:// URLs back to relative paths, strip ZWSP, normalize blanks
  let markdown = normalizeForSave(stripNbsp(unresolveMarkdownImages(note.content,),),);
  if (!markdown.endsWith("\n",)) markdown += "\n";
  await writeTextFile(filepath, markdown,);
}

export async function loadDailyNote(date: string,): Promise<DailyNote | null> {
  const filepath = await getNotePath(date,);
  const fileExists = await exists(filepath,);

  if (!fileExists) {
    return null;
  }

  const raw = await readTextFile(filepath,);
  // Strip &nbsp; from existing files, resolve asset paths, then
  // convert blank lines into ZWSP paragraphs so TipTap shows them.
  const resolved = await resolveMarkdownImages(stripNbsp(raw,),);
  const content = preserveBlankLines(resolved,);
  return { date, content, };
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

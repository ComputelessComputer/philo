import { join, } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readTextFile, writeTextFile, } from "@tauri-apps/plugin-fs";
import type { AssistantCitation, AssistantPendingChange, AssistantResult, AssistantScope, } from "./assistant";
import { getChatsDir, } from "./paths";

const CHAT_FILE_SUFFIX = ".json";
const CHAT_FILE_VERSION = 1;

export interface ChatHistoryEntry {
  id: string;
  title: string;
  prompt: string;
  selectedText: string | null;
  scope: AssistantScope;
  answer: string;
  citations: AssistantCitation[];
  pendingChanges: AssistantPendingChange[];
  createdAt: string;
}

function normalizeTitleSource(value: string,) {
  return value
    .replace(/\s+/g, " ",)
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "",)
    .replace(/[.!?]+$/g, "",);
}

function truncateTitle(value: string, maxLength = 60,) {
  if (value.length <= maxLength) return value;
  const truncated = value.slice(0, maxLength - 3,);
  const boundary = truncated.lastIndexOf(" ",);
  const safe = boundary >= 24 ? truncated.slice(0, boundary,) : truncated;
  return `${safe.trim()}...`;
}

function formatTitle(value: string,) {
  const normalized = truncateTitle(normalizeTitleSource(value,),);
  if (!normalized) return "";
  return normalized.replace(/^[a-z]/, (char,) => char.toUpperCase(),);
}

function slugify(value: string,) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-",)
    .replace(/^-+|-+$/g, "",)
    .slice(0, 48,);
}

function buildChatId(title: string, createdAt: string,) {
  const timestamp = createdAt.replace(/[:.]/g, "-",);
  const slug = slugify(title,) || "chat";
  return `${timestamp}-${slug}`;
}

function isCitation(value: unknown,): value is AssistantCitation {
  if (!value || typeof value !== "object") return false;
  return (
    typeof (value as AssistantCitation).date === "string"
    && typeof (value as AssistantCitation).title === "string"
    && typeof (value as AssistantCitation).snippet === "string"
  );
}

function isPendingChange(value: unknown,): value is AssistantPendingChange {
  if (!value || typeof value !== "object") return false;
  const change = value as AssistantPendingChange;
  return (
    typeof change.date === "string"
    && typeof change.beforeMarkdown === "string"
    && typeof change.afterMarkdown === "string"
    && typeof change.unifiedDiff === "string"
    && (change.cityBefore === null || change.cityBefore === undefined || typeof change.cityBefore === "string")
    && (change.cityAfter === null || change.cityAfter === undefined || typeof change.cityAfter === "string")
  );
}

function parseChatHistoryEntry(raw: string,): ChatHistoryEntry | null {
  try {
    const value = JSON.parse(raw,) as Partial<ChatHistoryEntry> & { version?: number; };
    if (value.version !== CHAT_FILE_VERSION) return null;
    if (
      typeof value.id !== "string"
      || typeof value.title !== "string"
      || typeof value.prompt !== "string"
      || typeof value.answer !== "string"
      || typeof value.createdAt !== "string"
      || (value.selectedText !== null && value.selectedText !== undefined && typeof value.selectedText !== "string")
      || (value.scope !== "today" && value.scope !== "recent")
      || !Array.isArray(value.citations,)
      || !value.citations.every(isCitation,)
      || !Array.isArray(value.pendingChanges,)
      || !value.pendingChanges.every(isPendingChange,)
    ) {
      return null;
    }

    return {
      id: value.id,
      title: value.title,
      prompt: value.prompt,
      selectedText: value.selectedText ?? null,
      scope: value.scope,
      answer: value.answer,
      citations: value.citations,
      pendingChanges: value.pendingChanges,
      createdAt: value.createdAt,
    };
  } catch {
    return null;
  }
}

export function deriveChatTitle(prompt: string, answer?: string | null,) {
  const fromPrompt = formatTitle(prompt,);
  if (fromPrompt) return fromPrompt;
  const fromAnswer = formatTitle(answer ?? "",);
  return fromAnswer || "Untitled chat";
}

export function buildChatHistoryEntry(input: {
  prompt: string;
  selectedText: string | null;
  scope: AssistantScope;
  result: AssistantResult;
  createdAt?: string;
},): ChatHistoryEntry {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const title = deriveChatTitle(input.prompt, input.result.answer,);

  return {
    id: buildChatId(title, createdAt,),
    title,
    prompt: input.prompt.trim(),
    selectedText: input.selectedText?.trim() || null,
    scope: input.scope,
    answer: input.result.answer,
    citations: input.result.citations,
    pendingChanges: input.result.pendingChanges,
    createdAt,
  };
}

async function ensureChatsDir() {
  const dir = await getChatsDir();
  if (!(await exists(dir,))) {
    await mkdir(dir, { recursive: true, },);
  }
  return dir;
}

async function getChatFilePath(id: string,) {
  const dir = await ensureChatsDir();
  return await join(dir, `${id}${CHAT_FILE_SUFFIX}`,);
}

export async function saveChatHistoryEntry(entry: ChatHistoryEntry,) {
  const path = await getChatFilePath(entry.id,);
  await writeTextFile(
    path,
    JSON.stringify(
      {
        version: CHAT_FILE_VERSION,
        ...entry,
      },
      null,
      2,
    ),
  );
  return entry;
}

export async function loadChatHistory(): Promise<ChatHistoryEntry[]> {
  const dir = await getChatsDir();
  if (!(await exists(dir,))) return [];

  const entries = await readDir(dir,);
  const chats = await Promise.all(
    entries
      .filter((entry,) => entry.isFile && typeof entry.name === "string" && entry.name.endsWith(CHAT_FILE_SUFFIX,))
      .map(async (entry,) => {
        const path = await join(dir, entry.name,);
        try {
          const raw = await readTextFile(path,);
          return parseChatHistoryEntry(raw,);
        } catch {
          return null;
        }
      },),
  );

  return chats
    .filter((entry,): entry is ChatHistoryEntry => entry !== null)
    .sort((left, right,) => right.createdAt.localeCompare(left.createdAt,));
}

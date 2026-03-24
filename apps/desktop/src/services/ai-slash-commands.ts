import type { DailyNote, } from "../types/note";
import type { AssistantResult, } from "./assistant";
import { buildSortedTodosPendingChange, } from "./tasks";

export interface AiSlashCommand {
  name: "triage";
}

export function parseAiSlashCommand(prompt: string,): AiSlashCommand | null {
  const normalized = prompt.trim();
  if (!normalized.startsWith("/",)) return null;

  return normalized === "/triage" ? { name: "triage", } : null;
}

export async function runAiSlashCommand(prompt: string, note: DailyNote,): Promise<AssistantResult | null> {
  const normalized = prompt.trim();
  if (!normalized.startsWith("/",)) return null;

  const command = parseAiSlashCommand(normalized,);
  if (!command) {
    return {
      answer: "Unknown slash command. Try `/triage` to start Sophia's focus review.",
      citations: [],
      pendingChanges: [],
    };
  }

  const pendingChange = await buildSortedTodosPendingChange(note,);
  if (!pendingChange) {
    return {
      answer: "The current note is already triaged, or there was nothing to reorder.",
      citations: [],
      pendingChanges: [],
    };
  }

  return {
    answer: "Prepared a triage pass for the current note. Review the diff below, then apply or decline it.",
    citations: [],
    pendingChanges: [pendingChange,],
  };
}

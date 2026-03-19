import type { DailyNote, } from "../types/note";
import type { AssistantResult, } from "./assistant";
import { buildSortedTodosPendingChange, } from "./tasks";

export interface AiSlashCommand {
  name: "todo";
  action: "organize";
}

export function parseAiSlashCommand(prompt: string,): AiSlashCommand | null {
  const normalized = prompt.trim();
  if (!normalized.startsWith("/",)) return null;

  const [command, action = "",] = normalized.split(/\s+/, 2,);
  if (command !== "/todo") return null;

  if (!action || action === "organize" || action === "sort") {
    return { name: "todo", action: "organize", };
  }

  return null;
}

export async function runAiSlashCommand(prompt: string, note: DailyNote,): Promise<AssistantResult | null> {
  const normalized = prompt.trim();
  if (!normalized.startsWith("/",)) return null;

  const command = parseAiSlashCommand(normalized,);
  if (!command) {
    return {
      answer: "Unknown slash command. Try `/todo organize` to sort the current note's todos by due date.",
      citations: [],
      pendingChanges: [],
    };
  }

  const pendingChange = await buildSortedTodosPendingChange(note,);
  if (!pendingChange) {
    return {
      answer: "The current note's todos are already sorted by due date, or there was nothing to reorder.",
      citations: [],
      pendingChanges: [],
    };
  }

  return {
    answer: "Prepared a todo reordering for the current note. Review the diff below, then apply or decline it.",
    citations: [],
    pendingChanges: [pendingChange,],
  };
}

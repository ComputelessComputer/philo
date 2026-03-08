import { z, } from "zod";
import { json2md, md2json, parseJsonContent, } from "../lib/markdown";
import type { DailyNote, } from "../types/note";
import { getApiKey, } from "./settings";
import { saveDailyNote, } from "./storage";

export const AI_NOT_CONFIGURED = "AI_NOT_CONFIGURED";

export type AssistantScope = "today" | "recent";

interface AssistantContext {
  today: DailyNote;
  recentNotes: DailyNote[];
}

interface AssistantRequest {
  prompt: string;
  scope: AssistantScope;
  context: AssistantContext;
}

const responseSchema = z.object({
  summary: z.string().min(1,),
  updates: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/,),
    content: z.string(),
    city: z.string().nullable().optional(),
  },),),
},);

export interface AssistantResult {
  summary: string;
  updatedDates: string[];
}

function formatNote(note: DailyNote,) {
  return {
    date: note.date,
    city: note.city ?? null,
    markdown: json2md(parseJsonContent(note.content,)),
  };
}

function buildSystemPrompt(scope: AssistantScope, todayDate: string,) {
  return `You are Sophia, an AI assistant inside the Philo daily notes app.

You receive the user's request plus the current note context.
Your job is to edit notes directly by returning a JSON object.

Rules:
- Return JSON only. No markdown fences. No explanation outside JSON.
- Be conservative. Only update notes that need to change.
- Preserve the user's tone and existing structure when possible.
- Prefer task list markdown for actionable todos: "- [ ] Task".
- When organizing a note, keep meaningful existing content and improve structure.
- Only write dates that are already present in the provided context.
- Default focus is today's note (${todayDate}).
- If scope is "today", only update today's note.
- If scope is "recent", you may update today's note and any provided recent notes.
- Return full markdown for each updated note in "updates". Do not return patches.

Response shape:
{
  "summary": "Short sentence describing what changed.",
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "content": "full markdown for that note",
      "city": "optional city value or null"
    }
  ]
}`;
}

export async function runAssistant(request: AssistantRequest,): Promise<AssistantResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(AI_NOT_CONFIGURED,);
  }

  const allowedDates = new Set([
    request.context.today.date,
    ...request.context.recentNotes.map((note,) => note.date),
  ],);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      system: buildSystemPrompt(request.scope, request.context.today.date,),
      messages: [{
        role: "user",
        content: JSON.stringify({
          prompt: request.prompt,
          scope: request.scope,
          today: formatNote(request.context.today,),
          recentNotes: request.scope === "recent"
            ? request.context.recentNotes.map(formatNote,)
            : [],
        }, null, 2,),
      },],
    },),
  },);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sophia failed (${response.status}): ${error}`,);
  }

  const data = await response.json();
  const text: string = data.content[0]?.text ?? "";
  const cleaned = text.replace(/^```(?:json)?\n?/m, "",).replace(/\n?```$/m, "",).trim();
  const parsed = responseSchema.parse(JSON.parse(cleaned,),);

  const updates = parsed.updates.filter((update,) => allowedDates.has(update.date));
  if (request.scope === "today" && updates.some((update,) => update.date !== request.context.today.date)) {
    throw new Error("Sophia returned changes outside today's note.",);
  }

  await Promise.all(updates.map((update,) => saveDailyNote({
    date: update.date,
    content: JSON.stringify(md2json(update.content,),),
    city: update.city ?? (update.date === request.context.today.date
      ? request.context.today.city
      : request.context.recentNotes.find((note,) => note.date === update.date)?.city),
  },)),);

  return {
    summary: parsed.summary,
    updatedDates: updates.map((update,) => update.date),
  };
}

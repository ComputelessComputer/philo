import { API_KEY_MISSING, generateAiText, } from "./ai";
import type { SharedStorageSchema, } from "./library";
import { loadSettings, resolveActiveAiConfig, } from "./settings";

const SYSTEM_PROMPT = `You are Sophia, an AI that generates Philo widgets as TSX source plus storage metadata.

Return ONLY a single JSON object with this exact shape:
{
  "source": "export default function Widget() { ... }",
  "storageSchema": {
    "tables": [],
    "namedQueries": [],
    "namedMutations": []
  }
}

Code runtime rules:
- "source" must be valid TSX source code for the Philo code-widget runtime.
- Do not wrap the source in markdown fences.
- Do not use import statements, require, dynamic import, eval, fetch, localStorage, window.parent, postMessage, or direct Tauri APIs.
- The source must export exactly one default component named Widget.
- JSX runs with React available globally as PhiloReact.
- The Philo widget SDK is available globally as Philo.
- You may render normal JSX elements like div, span, button, input, table, ul, li, etc.
- Keep the widget self-contained. Prefer inline styles over external dependencies.

Available Philo SDK APIs:
- Philo.useWidgetState(key, initialValue)
- Philo.useNow(intervalMs?)
- Philo.useQuery(name, params?)
- Philo.useMutation(name)

Available React APIs:
- const { useEffect, useMemo, useRef, useState } = PhiloReact;

Storage rules:
- If the widget needs durable user data, generate a matching storageSchema and use Philo.useQuery / Philo.useMutation.
- If the widget is display-only or only needs lightweight local state, return an empty storageSchema with tables/namedQueries/namedMutations as [].
- Use SQLite-friendly identifiers only: letters, numbers, underscores, hyphens.
- Support only single-table CRUD patterns.
- Do not emit SQL.
- If an existing storage schema is provided, return it exactly unchanged.

Design rules:
- Design widgets like compact utility panels: functional first, minimal chrome, clear hierarchy.
- Use normal React and HTML elements by default.
- Prefer semantic HTML like div, section, h1-h3, p, button, input, label, ul, li, table, and form.
- Do not invent or rely on a custom declarative component layer for ordinary UI.
- Keep Philo usage focused on host APIs like state, queries, mutations, and time.
- Use real interactive logic in code instead of inventing pseudo-DSL props.
- Prefer clear button labels and obvious state transitions.
- For timers/countdowns, use Philo.useWidgetState for the target timestamp and Philo.useNow(1000) for ticking updates.
- Never hardcode the current time or date if a live clock is intended.`;

export interface GeneratedWidgetResult {
  source: string;
  storageSchema: SharedStorageSchema;
}

function cleanJsonResponse(raw: string,): string {
  return raw.replace(/^```(?:json)?\n?/m, "",).replace(/\n?```$/m, "",).trim();
}

function stripCodeFence(raw: string,): string {
  return raw.replace(/^```(?:tsx|ts|jsx|js)?\n?/m, "",).replace(/\n?```$/m, "",).trim();
}

function normalizeGeneratedSource(source: string,): string {
  const cleaned = stripCodeFence(source,).trim();
  if (!cleaned) {
    throw new Error("Widget response must include source.",);
  }
  return cleaned;
}

function normalizeSharedStorageSchema(schema: SharedStorageSchema,): SharedStorageSchema {
  return {
    tables: schema.tables.map((table,) => ({
      ...table,
      indexes: table.indexes ?? [],
      columns: table.columns.map((column,) => ({
        ...column,
        name: column.name.trim(),
        type: column.type.toLowerCase(),
        notNull: column.notNull ?? false,
        primaryKey: column.primaryKey ?? false,
      })),
    })),
    namedQueries: schema.namedQueries.map((query,) => ({
      ...query,
      columns: query.columns ?? [],
      filters: query.filters ?? [],
      orderDesc: query.orderDesc ?? false,
    })),
    namedMutations: schema.namedMutations.map((mutation,) => ({
      ...mutation,
      setColumns: mutation.setColumns ?? [],
      filters: mutation.filters ?? [],
    })),
  };
}

function buildStoragePrompt(prompt: string, existingStorageSchema?: SharedStorageSchema,): string {
  if (!existingStorageSchema) {
    return prompt;
  }

  return [
    prompt,
    "",
    "Use this storageSchema exactly as-is. Do not rename, add, remove, or reorder fields:",
    JSON.stringify(existingStorageSchema, null, 2,),
  ].join("\n",);
}

export async function generateWidget(prompt: string,): Promise<string> {
  const generated = await generateWidgetWithStorage(prompt,);
  return generated.source;
}

export async function generateWidgetWithStorage(
  prompt: string,
  existingStorageSchema?: SharedStorageSchema,
): Promise<GeneratedWidgetResult> {
  const settings = await loadSettings();
  const config = resolveActiveAiConfig(settings,);
  if (!config) {
    throw new Error(`${API_KEY_MISSING}:${settings.aiProvider}`,);
  }

  const text = await generateAiText(
    config,
    SYSTEM_PROMPT,
    buildStoragePrompt(prompt, existingStorageSchema,),
  );
  const cleaned = cleanJsonResponse(text,);

  try {
    const parsed = JSON.parse(cleaned,) as Partial<GeneratedWidgetResult>;
    if (!parsed.source || !parsed.storageSchema) {
      throw new Error("Widget response must include source and storageSchema.",);
    }
    return {
      source: normalizeGeneratedSource(parsed.source,),
      storageSchema: normalizeSharedStorageSchema(parsed.storageSchema,),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("must include",)) {
      throw error;
    }
    throw new Error(`Sophia returned invalid widget JSON: ${cleaned.slice(0, 400,)}`,);
  }
}

export async function generateSharedWidget(
  prompt: string,
  existingStorageSchema?: SharedStorageSchema,
): Promise<GeneratedWidgetResult> {
  return generateWidgetWithStorage(prompt, existingStorageSchema,);
}

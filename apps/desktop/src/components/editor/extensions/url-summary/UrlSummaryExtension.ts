import { type Editor, Extension, } from "@tiptap/core";
import type { Node as ProseMirrorNode, } from "@tiptap/pm/model";
import { Plugin, PluginKey, } from "@tiptap/pm/state";
import type { EditorView, } from "@tiptap/pm/view";
import { normalizeUrlForSummary, } from "../../../../services/url-summary";

const DEFAULT_STALE_MS = 5 * 60 * 1000;
const URL_MATCH_RE = /https?:\/\/\S+/g;
const TRAILING_PUNCTUATION_RE = /[.,!?;:'"”’]+$/;
const urlSummaryPluginKey = new PluginKey<UrlSummaryPluginState>("url-summary",);

let occurrenceCounter = 0;

export interface UrlSummaryOccurrence {
  id: string;
  text: string;
  normalizedUrl: string;
  from: number;
  to: number;
  lastChangedAt: number;
}

interface UrlSummaryPluginState {
  occurrences: UrlSummaryOccurrence[];
}

interface UrlSummaryExtensionOptions {
  staleMs: number;
  onStaleUrl: (input: { editor: Editor; occurrence: UrlSummaryOccurrence; },) => Promise<boolean> | boolean;
}

function countOccurrences(value: string, needle: string,) {
  return Array.from(value,).filter((char,) => char === needle).length;
}

function trimTrailingUrlCharacters(candidate: string,) {
  let next = candidate.replace(TRAILING_PUNCTUATION_RE, "",);

  while (next.endsWith(")",) && countOccurrences(next, "(",) < countOccurrences(next, ")",)) {
    next = next.slice(0, -1,);
  }

  while (next.endsWith("]",) && countOccurrences(next, "[",) < countOccurrences(next, "]",)) {
    next = next.slice(0, -1,);
  }

  return next;
}

function isCodeTextNode(node: ProseMirrorNode, parent: ProseMirrorNode | null | undefined,) {
  return parent?.type.name === "codeBlock" || node.marks.some((mark,) => mark.type.name === "code");
}

function findTextUrls(text: string, basePos: number,) {
  const matches: Array<Pick<UrlSummaryOccurrence, "text" | "normalizedUrl" | "from" | "to">> = [];

  for (const match of text.matchAll(URL_MATCH_RE,)) {
    const start = match.index ?? 0;
    const rawMatch = trimTrailingUrlCharacters(match[0],);
    const normalizedUrl = normalizeUrlForSummary(rawMatch,);
    if (!normalizedUrl) continue;

    matches.push({
      text: rawMatch,
      normalizedUrl,
      from: basePos + start,
      to: basePos + start + rawMatch.length,
    },);
  }

  return matches;
}

function mapOccurrences(
  occurrences: UrlSummaryOccurrence[],
  mapping: import("@tiptap/pm/transform").Mapping,
  docSize: number,
) {
  return occurrences
    .map((occurrence,) => {
      const fromResult = mapping.mapResult(occurrence.from, 1,);
      const toResult = mapping.mapResult(occurrence.to, -1,);
      if (fromResult.deleted && toResult.deleted) return null;

      const from = Math.max(0, Math.min(fromResult.pos, docSize,),);
      const to = Math.max(from, Math.min(toResult.pos, docSize,),);
      return { ...occurrence, from, to, };
    },)
    .filter((occurrence,): occurrence is UrlSummaryOccurrence => occurrence !== null);
}

function findMatchingOccurrence(
  nextOccurrence: Pick<UrlSummaryOccurrence, "text" | "normalizedUrl" | "from" | "to">,
  previousOccurrences: UrlSummaryOccurrence[],
  usedIds: Set<string>,
) {
  let bestMatch: UrlSummaryOccurrence | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const occurrence of previousOccurrences) {
    if (usedIds.has(occurrence.id,)) continue;
    if (occurrence.text !== nextOccurrence.text || occurrence.normalizedUrl !== nextOccurrence.normalizedUrl) continue;

    const overlaps = occurrence.from <= nextOccurrence.to && nextOccurrence.from <= occurrence.to;
    const distance = Math.abs(occurrence.from - nextOccurrence.from,) + Math.abs(occurrence.to - nextOccurrence.to,);
    if (!overlaps && distance > 8) continue;
    if (distance >= bestScore) continue;

    bestMatch = occurrence;
    bestScore = distance;
  }

  return bestMatch;
}

function scanOccurrences(
  doc: ProseMirrorNode,
  previousOccurrences: UrlSummaryOccurrence[],
  now: number,
): UrlSummaryOccurrence[] {
  const scanned: Array<Pick<UrlSummaryOccurrence, "text" | "normalizedUrl" | "from" | "to">> = [];

  doc.nodesBetween(0, doc.content.size, (node, pos, parent,) => {
    if (!node.isText || typeof node.text !== "string") return;
    if (isCodeTextNode(node, parent,)) return;
    scanned.push(...findTextUrls(node.text, pos,),);
  },);

  const usedIds = new Set<string>();
  return scanned.map((occurrence,) => {
    const previous = findMatchingOccurrence(occurrence, previousOccurrences, usedIds,);
    if (previous) {
      usedIds.add(previous.id,);
      return {
        ...occurrence,
        id: previous.id,
        lastChangedAt: previous.lastChangedAt,
      };
    }

    occurrenceCounter += 1;
    return {
      ...occurrence,
      id: `url-summary-${occurrenceCounter}`,
      lastChangedAt: now,
    };
  },);
}

function getPluginState(view: EditorView,) {
  return urlSummaryPluginKey.getState(view.state,) ?? { occurrences: [], };
}

class UrlSummaryPluginView {
  private view: EditorView;
  private editor: Editor;
  private options: UrlSummaryExtensionOptions;
  private timers = new Map<string, number>();
  private inFlight = new Set<string>();
  private suppressed = new Set<string>();

  constructor(view: EditorView, editor: Editor, options: UrlSummaryExtensionOptions,) {
    this.view = view;
    this.editor = editor;
    this.options = options;
    this.sync();
  }

  update(view: EditorView,) {
    this.view = view;
    this.sync();
  }

  destroy() {
    for (const timeoutId of this.timers.values()) {
      window.clearTimeout(timeoutId,);
    }
    this.timers.clear();
    this.inFlight.clear();
    this.suppressed.clear();
  }

  private sync() {
    const occurrences = getPluginState(this.view,).occurrences;
    const activeIds = new Set(occurrences.map((occurrence,) => occurrence.id),);

    for (const [id, timeoutId,] of this.timers.entries()) {
      if (activeIds.has(id,)) continue;
      window.clearTimeout(timeoutId,);
      this.timers.delete(id,);
      this.inFlight.delete(id,);
      this.suppressed.delete(id,);
    }

    for (const occurrence of occurrences) {
      if (this.inFlight.has(occurrence.id,) || this.suppressed.has(occurrence.id,)) continue;
      const existingTimeout = this.timers.get(occurrence.id,);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout,);
      }

      const delay = Math.max(occurrence.lastChangedAt + this.options.staleMs - Date.now(), 0,);
      const timeoutId = window.setTimeout(() => {
        void this.runOccurrence(occurrence.id,);
      }, delay,);
      this.timers.set(occurrence.id, timeoutId,);
    }
  }

  private async runOccurrence(id: string,) {
    this.timers.delete(id,);
    if (this.inFlight.has(id,) || this.suppressed.has(id,)) return;

    const occurrence = getPluginState(this.view,).occurrences.find((entry,) => entry.id === id);
    if (!occurrence) return;

    const staleAt = occurrence.lastChangedAt + this.options.staleMs;
    if (Date.now() < staleAt) {
      this.sync();
      return;
    }

    this.inFlight.add(id,);
    try {
      const didHandle = await this.options.onStaleUrl({
        editor: this.editor,
        occurrence,
      },);
      if (!didHandle) {
        this.suppressed.add(id,);
      }
    } catch {
      this.suppressed.add(id,);
    } finally {
      this.inFlight.delete(id,);
      this.sync();
    }
  }
}

export function getUrlSummaryOccurrences(state: import("@tiptap/pm/state").EditorState,) {
  return urlSummaryPluginKey.getState(state,)?.occurrences ?? [];
}

export const UrlSummaryExtension = Extension.create<UrlSummaryExtensionOptions>({
  name: "urlSummary",

  addOptions() {
    return {
      staleMs: DEFAULT_STALE_MS,
      onStaleUrl: () => false,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin<UrlSummaryPluginState>({
        key: urlSummaryPluginKey,
        state: {
          init: (_, state,) => ({
            occurrences: scanOccurrences(state.doc, [], Date.now(),),
          }),
          apply: (tr, pluginState, _oldState, newState,) => ({
            occurrences: scanOccurrences(
              newState.doc,
              tr.docChanged
                ? mapOccurrences(pluginState.occurrences, tr.mapping, newState.doc.content.size,)
                : pluginState.occurrences,
              Date.now(),
            ),
          }),
        },
        view: (view,) => new UrlSummaryPluginView(view, editor, this.options,),
      },),
    ];
  },
},);

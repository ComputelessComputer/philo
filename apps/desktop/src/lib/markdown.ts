import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow, } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { MarkdownManager, } from "@tiptap/markdown";
import type { JSONContent, } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { ExcalidrawExtension, } from "../components/editor/extensions/excalidraw/ExcalidrawExtension";
import { HashtagExtension, } from "../components/editor/extensions/hashtag/HashtagExtension";
import { MentionChipExtension, } from "../components/editor/extensions/mention/MentionChipExtension";
import { CustomParagraph, } from "../components/editor/extensions/paragraph/ParagraphExtension";
import { CustomTaskItem, } from "../components/editor/extensions/task-item/TaskItemNode";
import { WidgetExtension, } from "../components/editor/extensions/widget/WidgetExtension";

export const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph", },],
};

export function isValidContent(content: unknown,): content is JSONContent {
  if (!content || typeof content !== "object") return false;
  const obj = content as Record<string, unknown>;
  return obj.type === "doc" && Array.isArray(obj.content,);
}

interface MarkdownIndentation {
  style?: "space" | "tab";
  size?: number;
}

function getExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6,], },
      listKeymap: false,
      paragraph: false,
    },),
    CustomParagraph,
    Image.configure({ inline: true, allowBase64: false, },),
    Underline,
    Link.configure({ openOnClick: false, },),
    TaskList,
    CustomTaskItem.configure({ nested: true, },),
    Table.configure({ resizable: true, },),
    TableRow,
    TableHeader,
    TableCell,
    Highlight,
    MentionChipExtension,
    HashtagExtension,
    ExcalidrawExtension,
    WidgetExtension,
    // FileHandler has no markdown relevance, excluded from MarkdownManager
  ];
}

const DEFAULT_INDENTATION = { style: "space", size: 2, } as const;
const markdownManagers = new Map<string, MarkdownManager>();

function normalizeIndentation(indentation?: MarkdownIndentation,): { style: "space" | "tab"; size: number; } {
  const style = indentation?.style === "tab" ? "tab" : DEFAULT_INDENTATION.style;
  const size = typeof indentation?.size === "number" && Number.isFinite(indentation.size,) && indentation.size > 0
    ? Math.floor(indentation.size,)
    : DEFAULT_INDENTATION.size;
  return { style, size, };
}

function getMarkdownManager(indentation?: MarkdownIndentation,): MarkdownManager {
  const normalized = normalizeIndentation(indentation,);
  const key = `${normalized.style}:${normalized.size}`;
  const existing = markdownManagers.get(key,);
  if (existing) return existing;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manager = new MarkdownManager({ extensions: getExtensions() as any, indentation: normalized, },);
  markdownManagers.set(key, manager,);
  return manager;
}

export function md2json(markdown: string, options?: { indentation?: MarkdownIndentation; },): JSONContent {
  try {
    const source = markdown.replace(/\r\n?/g, "\n",);
    const runs = Array.from(source.matchAll(/(?:\n[ \t]*){2,}/g,),);
    if (runs.length === 0) {
      const result = getMarkdownManager(options?.indentation,).parse(source,);
      return isValidContent(result,) ? result : EMPTY_DOC;
    }

    const allNodes: JSONContent[] = [];
    let cursor = 0;

    for (const run of runs) {
      const index = run.index ?? 0;
      const part = source.slice(cursor, index,);

      if (part.trim()) {
        const parsed = getMarkdownManager(options?.indentation,).parse(part,);
        if (isValidContent(parsed,) && parsed.content) {
          allNodes.push(...parsed.content,);
        }
      }

      const newlineCount = (run[0].match(/\n/g,) || []).length;
      const emptyParagraphCount = Math.max(1, newlineCount - 1,);
      for (let i = 0; i < emptyParagraphCount; i++) {
        allNodes.push({ type: "paragraph", },);
      }

      cursor = index + run[0].length;
    }

    const tail = source.slice(cursor,);
    if (tail.trim()) {
      const parsed = getMarkdownManager(options?.indentation,).parse(tail,);
      if (isValidContent(parsed,) && parsed.content) {
        allNodes.push(...parsed.content,);
      }
    }

    return allNodes.length > 0 ? { type: "doc", content: allNodes, } : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

export function json2md(json: JSONContent, options?: { indentation?: MarkdownIndentation; },): string {
  try {
    const serialized = getMarkdownManager(options?.indentation,).serialize(json,);
    return serialized.replace(/\n{4,}/g, (run,) => "\n".repeat(Math.floor(run.length / 2,),),);
  } catch {
    return "";
  }
}

export function parseJsonContent(raw: string | undefined | null,): JSONContent {
  if (typeof raw !== "string" || !raw.trim()) return EMPTY_DOC;
  try {
    const parsed = JSON.parse(raw,);
    return isValidContent(parsed,) ? parsed : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

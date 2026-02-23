import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow, } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { MarkdownManager, } from "@tiptap/markdown";
import type { JSONContent, } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { HashtagExtension, } from "../components/editor/extensions/hashtag/HashtagExtension";
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

function getExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6,], },
      listKeymap: false,
    },),
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
    HashtagExtension,
    WidgetExtension,
    // FileHandler has no markdown relevance, excluded from MarkdownManager
  ];
}

let _manager: MarkdownManager | null = null;

function getMarkdownManager(): MarkdownManager {
  if (!_manager) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _manager = new MarkdownManager({ extensions: getExtensions() as any, },);
  }
  return _manager;
}

export function md2json(markdown: string,): JSONContent {
  try {
    const cleaned = markdown.replace(/&nbsp;/g, "",);
    // Split on 3+ newlines — these mark where empty paragraphs should be injected.
    // A single blank line (\n\n) is just a block separator; two blank lines (\n\n\n) = empty paragraph.
    const parts = cleaned.split(/\n{3,}/,);

    if (parts.length <= 1) {
      const result = getMarkdownManager().parse(cleaned,);
      return isValidContent(result,) ? result : EMPTY_DOC;
    }

    const allNodes: JSONContent[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      if (part) {
        const parsed = getMarkdownManager().parse(part,);
        if (isValidContent(parsed,) && parsed.content) {
          allNodes.push(...parsed.content,);
        }
      }

      // Insert empty paragraph between chunks (not after the last one)
      if (i < parts.length - 1) {
        allNodes.push({ type: "paragraph", },);
      }
    }

    return allNodes.length > 0 ? { type: "doc", content: allNodes, } : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

export function json2md(json: JSONContent,): string {
  try {
    return (
      getMarkdownManager()
        .serialize(json,)
        // Strip &nbsp; that tiptap/markdown emits for empty paragraphs.
        // This leaves \n\n\n\n at empty paragraph boundaries (surrounding \n\n on each side).
        .replace(/&nbsp;/g, "",)
        // Collapse to exactly \n\n\n so the file uses two blank lines to mark empty paragraphs.
        .replace(/\n{4,}/g, "\n\n\n",)
    );
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

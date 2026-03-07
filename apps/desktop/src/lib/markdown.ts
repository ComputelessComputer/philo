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

const FENCED_CODE_BLOCK_RE = /(```[\s\S]*?```)/g;
const EMPTY_PARAGRAPH_MARKDOWN = "&nbsp;";

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

let _manager: MarkdownManager | null = null;

function getMarkdownManager(): MarkdownManager {
  if (!_manager) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _manager = new MarkdownManager({ extensions: getExtensions() as any, },);
  }
  return _manager;
}

function normalizeBlankLines(markdown: string,): string {
  return markdown
    .split(FENCED_CODE_BLOCK_RE,)
    .map((part, index,) => {
      if (index % 2 === 1) return part;

      return part.replace(/(?:\n[ \t]*){2,}/g, (run,) => {
        const newlineCount = (run.match(/\n/g,) || []).length;
        if (newlineCount <= 2) return "\n\n";

        return `\n\n${Array.from({ length: newlineCount - 2, }, () => `${EMPTY_PARAGRAPH_MARKDOWN}\n\n`,).join("",)}`;
      },);
    },)
    .join("",);
}

export function md2json(markdown: string,): JSONContent {
  try {
    const source = normalizeBlankLines(markdown.replace(/\r\n?/g, "\n",),);
    const result = getMarkdownManager().parse(source,);
    return isValidContent(result,) ? result : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

export function json2md(json: JSONContent,): string {
  try {
    return getMarkdownManager().serialize(json,);
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

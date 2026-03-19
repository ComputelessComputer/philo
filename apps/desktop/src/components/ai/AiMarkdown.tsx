import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow, } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor, } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, } from "react";
import "../editor/Editor.css";
import { md2json, } from "../../lib/markdown";
import { CustomParagraph, } from "../editor/extensions/paragraph/ParagraphExtension";
import { CustomTaskItem, } from "../editor/extensions/task-item/TaskItemNode";
import { UnderlineExtension, } from "../editor/extensions/underline/UnderlineExtension";

interface AiMarkdownProps {
  markdown: string;
}

function parseMarkdown(markdown: string,) {
  if (!markdown.trim()) {
    return {
      type: "doc",
      content: [{ type: "paragraph", },],
    };
  }

  try {
    return md2json(markdown,);
  } catch {
    return {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: markdown, },],
      },],
    };
  }
}

export function AiMarkdown({ markdown, }: AiMarkdownProps,) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        underline: false,
        listKeymap: false,
      },),
      CustomParagraph,
      Image.configure({ inline: true, allowBase64: false, },),
      UnderlineExtension,
      Link.configure({ openOnClick: true, autolink: true, },),
      TaskList,
      CustomTaskItem.configure({ nested: true, },),
      Table.configure({ resizable: false, HTMLAttributes: { class: "tiptap-table", }, },),
      TableRow,
      TableHeader,
      TableCell,
      Highlight,
    ],
    content: parseMarkdown(markdown,),
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "ai-markdown text-sm text-gray-900",
      },
    },
  },);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(parseMarkdown(markdown,), { emitUpdate: false, },);
  }, [editor, markdown,],);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

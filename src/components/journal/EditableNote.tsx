import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Markdown, } from "@tiptap/markdown";
import type { EditorView, } from "@tiptap/pm/view";
import { EditorContent, useEditor, } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, } from "react";
import "../editor/Editor.css";
import { resolveAssetUrl, saveImage, } from "../../services/images";
import { saveDailyNote, } from "../../services/storage";
import { DailyNote, } from "../../types/note";
import { EditorBubbleMenu, } from "../editor/EditorBubbleMenu";
import { WidgetExtension, } from "../editor/extensions/widget/WidgetExtension";

function insertImageViaView(file: File, view: EditorView,) {
  saveImage(file,).then(async (relativePath,) => {
    const assetUrl = await resolveAssetUrl(relativePath,);
    const node = view.state.schema.nodes.image.create({ src: assetUrl, alt: file.name, },);
    const tr = view.state.tr.replaceSelectionWith(node,);
    view.dispatch(tr,);
  },).catch((err,) => {
    console.error("Failed to insert image:", err,);
  },);
}

interface EditableNoteProps {
  note: DailyNote;
  placeholder?: string;
}

export default function EditableNote({ note, placeholder = "Start writing...", }: EditableNoteProps,) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder, },),
      Image.configure({
        inline: true,
        allowBase64: false,
      },),
      Link.configure({
        openOnClick: false,
        autolink: true,
      },),
      TaskList,
      TaskItem.configure({ nested: true, },),
      WidgetExtension,
      Markdown,
    ],
    content: "",
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-hidden px-6 text-gray-900 dark:text-gray-100",
      },
      handlePaste: (view, event,) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items,)) {
          if (item.type.startsWith("image/",)) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              insertImageViaView(file, view,);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event,) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        for (const file of Array.from(files,)) {
          if (file.type.startsWith("image/",)) {
            event.preventDefault();
            insertImageViaView(file, view,);
            return true;
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event,) => {
        if (event.metaKey) {
          const anchor = (event.target as HTMLElement).closest("a",);
          if (anchor?.href) {
            window.open(anchor.href, "_blank",);
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (view, event,) => {
        if (event.key === "Backspace") {
          const { $from, empty, } = view.state.selection;
          if (empty && $from.parentOffset === 0 && $from.parent.type.name === "heading") {
            const tr = view.state.tr.setBlockType($from.before(), $from.after(), view.state.schema.nodes.paragraph,);
            view.dispatch(tr,);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor, },) => {
      saveDailyNote({ ...note, content: editor.getMarkdown(), },).catch(console.error,);
    },
  },);

  // Parse markdown via setContent (useEditor's content prop doesn't run through Markdown extension)
  useEffect(() => {
    if (editor && note.content) {
      const current = editor.getMarkdown();
      if (current !== note.content) {
        editor.commands.setContent(note.content, { contentType: "markdown", },);
      }
    }
  }, [editor, note.content,],);

  return (
    <>
      {editor && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} />
    </>
  );
}

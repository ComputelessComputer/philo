import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

const NonInclusiveLink = Link.extend({
  inclusive() {
    return false;
  },
},);
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
import { CustomParagraph, } from "../editor/extensions/paragraph/ParagraphExtension";
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
      StarterKit.configure({
        paragraph: false,
      },),
      CustomParagraph,
      Placeholder.configure({ placeholder, },),
      Image.configure({
        inline: true,
        allowBase64: false,
      },),
      NonInclusiveLink.configure({
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
      handleKeyDown: (_view, event,) => {
        if (event.key === "Tab") {
          event.preventDefault();
          if (event.shiftKey) {
            if (editor?.can().liftListItem("listItem",)) {
              editor.commands.liftListItem("listItem",);
            } else if (editor?.can().liftListItem("taskItem",)) {
              editor.commands.liftListItem("taskItem",);
            }
          } else {
            if (editor?.can().sinkListItem("listItem",)) {
              editor.commands.sinkListItem("listItem",);
            } else if (editor?.can().sinkListItem("taskItem",)) {
              editor.commands.sinkListItem("taskItem",);
            }
          }
          return true;
        }
        if (event.metaKey && event.key === "l") {
          event.preventDefault();
          editor?.chain().focus().toggleTaskList().run();
          return true;
        }
        if (event.key === "Backspace") {
          const { $from, empty, } = _view.state.selection;
          if (empty && $from.parentOffset === 0 && $from.parent.type.name === "heading") {
            const tr = _view.state.tr.setBlockType($from.before(), $from.after(), _view.state.schema.nodes.paragraph,);
            _view.dispatch(tr,);
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
      // Normalize both sides: strip ZWSP + collapse blank lines so the
      // preprocessed note.content and the serialised editor output compare equal.
      const norm = (s: string,) => s.replace(/\u200B/g, "",).replace(/\n{2,}/g, "\n\n",).trimEnd();
      if (norm(editor.getMarkdown(),) !== norm(note.content,)) {
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

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import "../editor/Editor.css";
import { DailyNote } from "../../types/note";
import { saveDailyNote } from "../../services/storage";

interface EditableNoteProps {
  note: DailyNote;
}

export default function EditableNote({ note }: EditableNoteProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Plan ahead...",
      }),
      Markdown,
    ],
    content: note.content,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-hidden px-16 text-gray-900 dark:text-gray-100",
      },
    },
    onUpdate: ({ editor }) => {
      saveDailyNote({ ...note, content: editor.getJSON() }).catch(console.error);
    },
  });

  return <EditorContent editor={editor} />;
}

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import "../editor/Editor.css";
import { DailyNote } from "../../types/note";

interface PastNoteProps {
  note: DailyNote;
}

export default function PastNote({ note }: PastNoteProps) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: note.content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "max-w-none px-16 text-gray-900 dark:text-gray-100 opacity-60",
      },
    },
  });

  return <EditorContent editor={editor} />;
}

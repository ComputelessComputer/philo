import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import { useEffect } from 'react';
import { CustomTaskItem } from '../editor/extensions/task-item/TaskItemNode';
import '../editor/Editor.css';
import { DailyNote as DailyNoteType } from '../../types/note';
import { formatDate, isToday } from '../../types/note';
import { saveDailyNote } from '../../services/storage';

interface DailyNoteProps {
  note: DailyNoteType;
  onUpdate?: (note: DailyNoteType) => void;
}

export default function DailyNote({ note, onUpdate }: DailyNoteProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      CustomTaskItem,
    ],
    content: note.content,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-hidden min-h-[300px] p-6 text-gray-900 dark:text-gray-100',
      },
    },
    onUpdate: ({ editor }) => {
      const updatedNote: DailyNoteType = {
        ...note,
        content: editor.getJSON(),
      };
      
      // Save to disk
      saveDailyNote(updatedNote).catch(console.error);
      
      // Notify parent
      onUpdate?.(updatedNote);
    },
  });

  useEffect(() => {
    if (editor) {
      // Ensure editor is editable
      editor.setEditable(true);
      
      if (note.content) {
        const currentContent = editor.getJSON();
        if (JSON.stringify(currentContent) !== JSON.stringify(note.content)) {
          editor.commands.setContent(note.content);
        }
      }
    }
  }, [editor, note.content]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
      {/* Date header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatDate(note.date)}
          </h2>
          {isToday(note.date) && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
              today
            </span>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

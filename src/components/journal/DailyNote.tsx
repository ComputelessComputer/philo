import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import { useEffect } from 'react';
import { CustomTaskItem } from '../editor/extensions/task-item/TaskItemNode';
import { DailyNote as DailyNoteType } from '../../types/note';
import { formatDate } from '../../types/note';
import { saveDailyNote } from '../../services/storage';

interface DailyNoteProps {
  note: DailyNoteType;
  onUpdate?: (note: DailyNoteType) => void;
}

export default function DailyNote({ note, onUpdate }: DailyNoteProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        taskList: false, // Disable default task list
      }),
      TaskList,
      CustomTaskItem,
    ],
    content: note.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-6',
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
    if (editor && note.content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(note.content)) {
        editor.commands.setContent(note.content);
      }
    }
  }, [editor, note.content]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
      {/* Date header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatDate(note.date)}
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {note.date}
        </div>
      </div>
      
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

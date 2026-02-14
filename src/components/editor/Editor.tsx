import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function Editor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start writing...</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[200px]',
      },
    },
  });

  return (
    <div className="w-full">
      <EditorContent editor={editor} />
    </div>
  );
}

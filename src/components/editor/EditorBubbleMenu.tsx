import { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { generateWidget } from '../../services/generate';

interface EditorBubbleMenuProps {
  editor: Editor;
}

/**
 * Find a widget node by ID and update its attributes.
 */
function updateWidgetById(editor: Editor, id: string, attrs: Record<string, unknown>) {
  const { doc } = editor.state;
  const tr = editor.state.tr;
  let found = false;

  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === 'widget' && node.attrs.id === id) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
      found = true;
      return false;
    }
  });

  if (found) {
    editor.view.dispatch(tr);
  }
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [building, setBuilding] = useState(false);

  const handleBuild = async () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (!selectedText.trim() || building) return;

    setBuilding(true);

    // Insert loading widget, replacing selection
    const widgetId = crypto.randomUUID();
    editor
      .chain()
      .focus()
      .deleteSelection()
      .insertContent({
        type: 'widget',
        attrs: { id: widgetId, prompt: selectedText, html: '', loading: true, saved: false },
      })
      .run();

    try {
      const html = await generateWidget(selectedText);
      updateWidgetById(editor, widgetId, { html, loading: false });
    } catch (err) {
      console.error('Build failed:', err);
      // Remove the loading widget on failure
      updateWidgetById(editor, widgetId, {
        loading: false,
        html: `<div style="padding:24px;font-family:system-ui;color:#ef4444;text-align:center">
          <p style="margin:0;font-weight:600">Build failed</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${
            err instanceof Error && err.message === 'API_KEY_MISSING'
              ? 'No API key configured. Add your Anthropic key in Settings.'
              : 'Something went wrong. Try again.'
          }</p>
        </div>`,
      });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ from, to }: { from: number; to: number }) => from !== to}
    >
      <div className="bubble-menu">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`bubble-btn ${editor.isActive('bold') ? 'bubble-btn-active' : ''}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`bubble-btn bubble-btn-italic ${editor.isActive('italic') ? 'bubble-btn-active' : ''}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`bubble-btn bubble-btn-strike ${editor.isActive('strike') ? 'bubble-btn-active' : ''}`}
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`bubble-btn ${editor.isActive('code') ? 'bubble-btn-active' : ''}`}
        >
          {'</>'}
        </button>
        <div className="bubble-divider" />
        <button
          onClick={handleBuild}
          className={`bubble-btn bubble-btn-build ${building ? 'bubble-btn-building' : ''}`}
          disabled={building}
        >
          {building ? 'Building...' : '⌘⇧↵ Build'}
        </button>
      </div>
    </BubbleMenu>
  );
}

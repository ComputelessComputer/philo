import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { WidgetView } from './WidgetView';
import { generateWidget } from '../../../../services/generate';

export interface WidgetAttributes {
  id: string;
  html: string;
  prompt: string;
  saved: boolean;
  loading: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    widget: {
      insertWidget: (attrs: Partial<WidgetAttributes> & { prompt: string }) => ReturnType;
    };
  }
}

/**
 * Find a widget node by ID and update its attributes via transaction.
 */
function updateWidgetById(editor: import('@tiptap/core').Editor, id: string, attrs: Record<string, unknown>) {
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

export const WidgetExtension = Node.create({
  name: 'widget',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      html: { default: '' },
      prompt: { default: '' },
      saved: { default: false },
      loading: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-widget': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WidgetView);
  },

  addCommands() {
    return {
      insertWidget:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: crypto.randomUUID(),
              html: '',
              saved: false,
              loading: false,
              ...attrs,
            },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Shift-Mod-Enter': () => {
        const { from, to } = this.editor.state.selection;
        const selectedText = this.editor.state.doc.textBetween(from, to);
        if (!selectedText.trim()) return false;

        const widgetId = crypto.randomUUID();
        this.editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: 'widget',
            attrs: { id: widgetId, prompt: selectedText, html: '', loading: true, saved: false },
          })
          .run();

        // Fire generation asynchronously
        generateWidget(selectedText)
          .then((html) => {
            updateWidgetById(this.editor, widgetId, { html, loading: false });
          })
          .catch((err) => {
            console.error('Build failed:', err);
            const errorHtml = `<div style="padding:24px;font-family:system-ui;color:#ef4444;text-align:center">
              <p style="margin:0;font-weight:600">Build failed</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${
                err instanceof Error && err.message === 'API_KEY_MISSING'
                  ? 'No API key configured. Add your Anthropic key in Settings.'
                  : 'Something went wrong. Try again.'
              }</p>
            </div>`;
            updateWidgetById(this.editor, widgetId, { html: errorHtml, loading: false });
          });

        return true;
      },
    };
  },
});

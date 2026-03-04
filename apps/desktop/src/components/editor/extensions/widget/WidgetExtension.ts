import { mergeAttributes, Node, } from "@tiptap/core";
import type { JSONContent, } from "@tiptap/core";
import { ReactNodeViewRenderer, } from "@tiptap/react";
import { generateWidget, } from "../../../../services/generate";
import { WidgetView, } from "./WidgetView";

function escapeAttr(s: string,): string {
  return s
    .replace(/&/g, "&amp;",)
    .replace(/"/g, "&quot;",)
    .replace(/</g, "&lt;",)
    .replace(/>/g, "&gt;",);
}

export interface WidgetAttributes {
  id: string;
  /** JSON-stringified Spec from json-render, or empty string */
  spec: string;
  prompt: string;
  saved: boolean;
  loading: boolean;
  error: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType,> {
    widget: {
      insertWidget: (attrs: Partial<WidgetAttributes> & { prompt: string; },) => ReturnType;
    };
  }
}

/**
 * Find a widget node by ID and update its attributes via transaction.
 */
function updateWidgetById(editor: import("@tiptap/core").Editor, id: string, attrs: Record<string, unknown>,) {
  const { doc, } = editor.state;
  const tr = editor.state.tr;
  let found = false;

  doc.descendants((node, pos,) => {
    if (found) return false;
    if (node.type.name === "widget" && node.attrs.id === id) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs, },);
      found = true;
      return false;
    }
  },);

  if (found) {
    editor.view.dispatch(tr,);
  }
}

export const WidgetExtension = Node.create({
  name: "widget",
  group: "block",
  atom: true,
  draggable: true,

  renderMarkdown(node: JSONContent,) {
    const a = node.attrs || {};
    const parts = ['<div data-widget=""',];
    if (a.id) parts.push(` data-id="${escapeAttr(String(a.id,),)}"`,);
    if (a.spec) parts.push(` data-spec="${escapeAttr(String(a.spec,),)}"`,);
    if (a.prompt) parts.push(` data-prompt="${escapeAttr(String(a.prompt,),)}"`,);
    if (a.saved) parts.push(' data-saved="true"',);
    parts.push("></div>",);
    return parts.join("",) + "\n\n";
  },

  addAttributes() {
    return {
      id: { default: null, },
      spec: { default: "", },
      prompt: { default: "", },
      saved: {
        default: false,
        parseHTML: (el: HTMLElement,) => el.getAttribute("data-saved",) === "true",
      },
      loading: { default: false, rendered: false, },
      error: { default: "", rendered: false, },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-widget]", },];
  },

  renderHTML({ HTMLAttributes, },) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-widget": "", },),];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WidgetView,);
  },

  addCommands() {
    return {
      insertWidget: (attrs,) => ({ commands, },) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            id: crypto.randomUUID(),
            spec: "",
            saved: false,
            loading: false,
            error: "",
            ...attrs,
          },
        },);
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        const { from, to, } = this.editor.state.selection;
        const selectedText = this.editor.state.doc.textBetween(from, to,);
        if (!selectedText.trim()) return false;

        const widgetId = crypto.randomUUID();
        this.editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent({
            type: "widget",
            attrs: { id: widgetId, prompt: selectedText, spec: "", loading: true, saved: false, error: "", },
          },)
          .run();

        generateWidget(selectedText,)
          .then((spec,) => {
            updateWidgetById(this.editor, widgetId, { spec: JSON.stringify(spec,), loading: false, },);
          },)
          .catch((err,) => {
            const msg = err instanceof Error && err.message === "API_KEY_MISSING"
              ? "No API key configured. Add your Anthropic key in Settings (⌘,)."
              : err instanceof Error
              ? err.message
              : "Something went wrong.";
            updateWidgetById(this.editor, widgetId, { loading: false, error: msg, },);
          },);

        return true;
      },
    };
  },
},);

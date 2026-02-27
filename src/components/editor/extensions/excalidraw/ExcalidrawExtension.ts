import { mergeAttributes, Node, } from "@tiptap/core";
import type { JSONContent, } from "@tiptap/core";
import { ReactNodeViewRenderer, } from "@tiptap/react";
import { ExcalidrawView, } from "./ExcalidrawView";

function escapeAttr(s: string,): string {
  return s
    .replace(/&/g, "&amp;",)
    .replace(/"/g, "&quot;",)
    .replace(/</g, "&lt;",)
    .replace(/>/g, "&gt;",);
}

export interface ExcalidrawAttributes {
  file: string;
  path: string;
}

export const ExcalidrawExtension = Node.create({
  name: "excalidraw",
  group: "block",
  atom: true,
  draggable: true,

  renderMarkdown(node: JSONContent,) {
    const file = String(node.attrs?.file ?? "",);
    if (!file) return "";
    return `![[${file}]]\n\n`;
  },

  addAttributes() {
    return {
      file: {
        default: "",
        parseHTML: (el: HTMLElement,) => el.getAttribute("data-file",) ?? "",
      },
      path: {
        default: "",
        parseHTML: (el: HTMLElement,) => el.getAttribute("data-path",) ?? "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-excalidraw]", },];
  },

  renderHTML({ HTMLAttributes, },) {
    const attrs = {
      ...HTMLAttributes,
      "data-excalidraw": "",
      "data-file": escapeAttr(String(HTMLAttributes.file ?? "",),),
      ...(HTMLAttributes.path
        ? { "data-path": escapeAttr(String(HTMLAttributes.path,),), }
        : {}),
    };
    return ["div", mergeAttributes(attrs,),];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawView,);
  },
},);

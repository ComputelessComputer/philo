import { Extension, } from "@tiptap/core";
import { Plugin, PluginKey, } from "@tiptap/pm/state";
import { Decoration, DecorationSet, } from "@tiptap/pm/view";

const HASHTAG_RE = /(^|[\s([{])([#@][a-zA-Z]\w*)\b/g;

export const HashtagExtension = Extension.create({
  name: "hashtag",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hashtag",),
        props: {
          decorations(state,) {
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos,) => {
              if (!node.isText) return;
              // Skip text inside inline code marks
              if (node.marks.some((m,) => m.type.name === "code")) return;

              const text = node.text ?? "";
              HASHTAG_RE.lastIndex = 0;
              let match;
              while ((match = HASHTAG_RE.exec(text,)) !== null) {
                const prefix = match[1] ?? "";
                const token = match[2] ?? "";
                const start = pos + match.index + prefix.length;
                decorations.push(
                  Decoration.inline(start, start + token.length, {
                    class: "hashtag",
                  },),
                );
              }
            },);

            return DecorationSet.create(state.doc, decorations,);
          },
        },
      },),
    ];
  },
},);

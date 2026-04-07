import { Extension, } from "@tiptap/core";
import { Plugin, PluginKey, } from "@tiptap/pm/state";
import { Decoration, DecorationSet, } from "@tiptap/pm/view";

const HASHTAG_RE = /(^|[\s([{])([#@][a-zA-Z]\w*)\b/g;
const PRIORITY_TAGS = new Set(["#urgent", "#high", "#mid", "#low",],);

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
                const normalizedToken = token.toLowerCase();
                const classes = PRIORITY_TAGS.has(normalizedToken,)
                  ? `hashtag hashtag-priority hashtag-priority-${normalizedToken.slice(1,)}`
                  : "hashtag";
                decorations.push(
                  Decoration.inline(start, start + token.length, {
                    class: classes,
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

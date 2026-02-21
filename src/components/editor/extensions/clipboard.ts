import { Extension, getTextBetween, getTextSerializersFromSchema, } from "@tiptap/core";
import { Plugin, PluginKey, } from "@tiptap/pm/state";

import { json2md, } from "../../../lib/markdown";

export const ClipboardTextSerializer = Extension.create({
  name: "clipboardTextSerializer",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer",),
        props: {
          clipboardTextSerializer: () => {
            const { editor, } = this;
            const { state, schema, } = editor;
            const { doc, selection, } = state;
            const { ranges, } = selection;
            const from = Math.min(...ranges.map((range,) => range.$from.pos),);
            const to = Math.max(...ranges.map((range,) => range.$to.pos),);

            if (from === 0 && to === doc.content.size) {
              return json2md(editor.getJSON(),);
            }

            const textSerializers = getTextSerializersFromSchema(schema,);
            return getTextBetween(doc, { from, to, }, { textSerializers, },);
          },
        },
      },),
    ];
  },
},);

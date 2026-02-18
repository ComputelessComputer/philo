import { Paragraph, } from "@tiptap/extension-paragraph";

export const CustomParagraph = Paragraph.extend({
  renderMarkdown: (node, helpers,) => {
    const content = helpers.renderChildren(node.content || [],);
    if (content === "") {
      return "\u200B\n\n";
    }
    return `${content}\n\n`;
  },
},);

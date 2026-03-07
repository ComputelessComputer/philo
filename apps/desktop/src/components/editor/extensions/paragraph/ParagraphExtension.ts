import { Paragraph, } from "@tiptap/extension-paragraph";

const EMPTY_MARKER = "\u200B";
const EMPTY_PARAGRAPH_MARKDOWN = "&nbsp;";

export const CustomParagraph = Paragraph.extend({
  parseMarkdown: (token, helpers,) => {
    const tokens = token.tokens || [];

    const content = helpers.parseInline(tokens,);

    if (
      content.length === 1
      && content[0].type === "text"
      && (content[0].text === EMPTY_MARKER || content[0].text === "&nbsp;" || content[0].text === "\u00A0")
    ) {
      return helpers.createNode("paragraph", undefined, [],);
    }

    return helpers.createNode("paragraph", undefined, content,);
  },

  renderMarkdown: (node, helpers,) => {
    const content = Array.isArray(node.content,) ? node.content : [];
    if (content.length === 0) {
      return EMPTY_PARAGRAPH_MARKDOWN;
    }
    return helpers.renderChildren(content,);
  },
},);

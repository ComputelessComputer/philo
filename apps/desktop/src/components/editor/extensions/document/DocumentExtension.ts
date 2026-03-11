import { Node, } from "@tiptap/core";
import type { JSONContent, } from "@tiptap/react";

function isEmptyParagraph(node: JSONContent | undefined,): boolean {
  return node?.type === "paragraph"
    && (!Array.isArray(node.content,) || node.content.length === 0);
}

function isListNode(node: JSONContent | undefined,): boolean {
  return node?.type === "bulletList"
    || node?.type === "orderedList"
    || node?.type === "taskList";
}

export const CustomDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",

  renderMarkdown(node, helpers,) {
    const content = node.content || [];
    let markdown = "";
    let index = 0;

    while (index < content.length) {
      let leadingEmptyCount = 0;
      while (index < content.length && isEmptyParagraph(content[index],)) {
        leadingEmptyCount += 1;
        index += 1;
      }

      if (markdown.length === 0 && leadingEmptyCount > 0) {
        markdown += "\n".repeat(leadingEmptyCount,);
      }

      if (index >= content.length) {
        if (markdown.length > 0 && leadingEmptyCount > 0) {
          markdown += "\n".repeat(leadingEmptyCount + 1,);
        }
        break;
      }

      const current = content[index];
      markdown += helpers.renderChildren([current,],);
      index += 1;

      let separatorParagraphs = 0;
      while (index < content.length && isEmptyParagraph(content[index],)) {
        separatorParagraphs += 1;
        index += 1;
      }

      if (index >= content.length) {
        if (separatorParagraphs > 0) {
          markdown += "\n".repeat(separatorParagraphs + 1,);
        }
        break;
      }

      const next = content[index];
      const baseSeparator = isListNode(current,) && isListNode(next,) ? 1 : 2;
      markdown += "\n".repeat(baseSeparator + separatorParagraphs,);
    }

    return markdown;
  },
},);

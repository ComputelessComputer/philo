/**
 * Format a note by grouping tagged items (#later, #idea, #todo, etc.) at the
 * bottom, each under a single `- #tag` header with children nested below it.
 *
 * Handles both input styles:
 *   - `- #later some content`          → inline
 *   - `- #later\n\t- some content`     → already nested
 *
 * Output always uses the nested form:
 *   - #later
 *     - some content
 *     - another item
 */
export function formatNote(markdown: string,): string {
  const lines = markdown.trimEnd().split("\n",);

  // tag → collected child lines (already indented with one \t)
  const tagGroups = new Map<string, string[]>();
  // Insertion-order list of tags so output order matches first appearance
  const tagOrder: string[] = [];
  const regularLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Top-level bullet with inline tag content: `- #tag some text`
    const inlineMatch = line.match(/^([-*]) #(\w+)\s+(.+)$/,);
    // Top-level bullet that IS the tag header: `- #tag` (no trailing content)
    const headerMatch = !inlineMatch && line.match(/^([-*]) #(\w+)\s*$/,);

    if (inlineMatch) {
      const tag = inlineMatch[2];
      const content = inlineMatch[3];
      if (!tagGroups.has(tag,)) {
        tagGroups.set(tag, [],);
        tagOrder.push(tag,);
      }
      tagGroups.get(tag,)!.push(`\t- ${content}`,);
      i++;
    } else if (headerMatch) {
      const tag = headerMatch[2];
      if (!tagGroups.has(tag,)) {
        tagGroups.set(tag, [],);
        tagOrder.push(tag,);
      }
      i++;

      // Collect indented child lines that immediately follow
      while (i < lines.length && /^\s/.test(lines[i],)) {
        const child = lines[i];
        // Strip one indentation level (tab or 2 spaces), then re-prefix with \t
        // so all children sit at a uniform depth under the tag header.
        const stripped = child.replace(/^(\t| {2})/, "",);
        tagGroups.get(tag,)!.push(`\t${stripped}`,);
        i++;
      }
    } else {
      regularLines.push(line,);
      i++;
    }
  }

  // Drop trailing blank lines from the regular section
  while (regularLines.length > 0 && regularLines[regularLines.length - 1].trim() === "") {
    regularLines.pop();
  }

  const result: string[] = [...regularLines,];

  for (const tag of tagOrder) {
    const children = tagGroups.get(tag,)!;
    result.push("",);
    result.push(`- #${tag}`,);
    result.push(...children,);
  }

  return result.join("\n",) + "\n";
}

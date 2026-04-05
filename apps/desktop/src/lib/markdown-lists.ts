const UNICODE_BULLET_MARKER_SOURCE = "[•◦‣⁃∙▪●○◉◌■□▸▹►]";
const TASK_LIST_RE = /(^|\n)[\t ]*(?:[-*+] )?\[[ xX]\]\s+/m;
const LIST_LINE_RE = new RegExp(
  `^[\\t ]*(?:[-*+] |\\d+\\. |${UNICODE_BULLET_MARKER_SOURCE}\\s+)`,
);
const UNICODE_BULLET_LINE_RE = new RegExp(
  `^(${UNICODE_BULLET_MARKER_SOURCE})(?:([\\t ]+)(.*))?$`,
);

export function shouldParseMarkdownPaste(text: string, html: string,) {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (TASK_LIST_RE.test(text,)) {
    return true;
  }

  if (html) {
    return false;
  }

  const lines = trimmed.split(/\r?\n/,);
  const listLineCount = lines.filter(line => LIST_LINE_RE.test(line,)).length;
  return listLineCount >= 2;
}

export function normalizeMarkdownParsingLine(line: string,) {
  const leadingWhitespace = line.match(/^[\t ]*/,)?.[0] ?? "";
  const expandedIndentation = leadingWhitespace.replace(/\t/g, "    ",);
  const rest = line.slice(leadingWhitespace.length,);

  if (leadingWhitespace.includes("\t",) && /^\[([ xX])\]\s+/.test(rest,)) {
    return `${expandedIndentation}- ${rest}`;
  }

  const unicodeBulletMatch = rest.match(UNICODE_BULLET_LINE_RE,);
  if (unicodeBulletMatch) {
    return `${expandedIndentation}- ${unicodeBulletMatch[3] ?? ""}`;
  }

  return `${expandedIndentation}${rest}`;
}

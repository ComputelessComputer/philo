import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMarkdownParsingLine, shouldParseMarkdownPaste, } from "./markdown-lists.ts";

test("normalizes unicode bullet markers into markdown list markers", () => {
  assert.equal(normalizeMarkdownParsingLine("• tiptap -> react-prosemirror",), "- tiptap -> react-prosemirror",);
  assert.equal(normalizeMarkdownParsingLine("  ◦ md -> sqlite",), "  - md -> sqlite",);
});

test("preserves existing task list indentation normalization", () => {
  assert.equal(normalizeMarkdownParsingLine("\t[ ] ship desktop build",), "    - [ ] ship desktop build",);
});

test("treats unicode bullet text as markdown-like paste content", () => {
  assert.equal(shouldParseMarkdownPaste("april\n• tiptap -> react-prosemirror\n• md -> sqlite", "",), true,);
});

test("ignores rich html pastes so the editor can keep native handling", () => {
  assert.equal(
    shouldParseMarkdownPaste("april\n• tiptap -> react-prosemirror\n• md -> sqlite", "<ul><li>x</li></ul>",),
    false,
  );
});

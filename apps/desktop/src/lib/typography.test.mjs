import assert from "node:assert/strict";
import test from "node:test";

import { normalizeArrowLigatures, } from "./typography.ts";

test("replaces ascii right arrows with unicode arrows", () => {
  assert.equal(normalizeArrowLigatures("tiptap -> react-prosemirror",), "tiptap → react-prosemirror",);
  assert.equal(normalizeArrowLigatures("md -> sqlite -> sync",), "md → sqlite → sync",);
});

test("leaves unrelated text unchanged", () => {
  assert.equal(normalizeArrowLigatures("roadmap april may",), "roadmap april may",);
});

// Generated file. Do not edit directly.
// Regenerate with the profile schema generation script.

import type { PatchRuleTable } from "@spectotal/ast-schema";

export const w3cPatchRulesByKind: PatchRuleTable = {
  "document": {
    accepts: new Set([
    "heading",
    "section",
    "paragraph",
    "note",
    "example",
    "issue",
    "flowElement",
    "voidElement",
  ]),
  },
  "section": {
    accepts: new Set([
    "heading",
    "section",
    "paragraph",
    "note",
    "example",
    "issue",
    "requirement",
    "flowElement",
    "voidElement",
  ]),
  },
  "heading": {
    accepts: new Set([
    "text",
    "phrasingElement",
  ]),
    minItems: 1,
  },
  "paragraph": {
    accepts: new Set([
    "text",
    "phrasingElement",
  ]),
    minItems: 1,
  },
  "text": null,
  "requirement": {
    accepts: new Set([
    "paragraph",
    "note",
    "example",
    "flowElement",
    "voidElement",
  ]),
  },
  "note": {
    accepts: new Set([
    "paragraph",
    "flowElement",
    "voidElement",
  ]),
  },
  "example": {
    accepts: new Set([
    "heading",
    "paragraph",
    "flowElement",
    "voidElement",
  ]),
  },
  "issue": {
    accepts: new Set([
    "heading",
    "paragraph",
    "flowElement",
    "voidElement",
  ]),
  },
  "flowElement": {
    accepts: new Set([
    "heading",
    "section",
    "paragraph",
    "note",
    "example",
    "issue",
    "requirement",
    "flowElement",
    "voidElement",
  ]),
  },
  "phrasingElement": {
    accepts: new Set([
    "text",
    "phrasingElement",
  ]),
  },
  "voidElement": null,
};

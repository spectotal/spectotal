// Generated file. Do not edit directly.
// Regenerate with the profile schema generation script.

import type { NodeSchemaMap } from "@spectotal/ast-schema";

export const w3cProfileId = "w3c";
export const w3cRootKind = "document";

export const w3cNodeSchemas = {
  "document": {
      "kind": "document",
      "children": {
            "accepts": [
                    "heading",
                    "section",
                    "paragraph",
                    "note",
                    "example",
                    "issue",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "section": {
      "kind": "section",
      "children": {
            "accepts": [
                    "heading",
                    "section",
                    "paragraph",
                    "note",
                    "example",
                    "issue",
                    "requirement",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "heading": {
      "kind": "heading",
      "fields": {
            "level": {
                    "type": "number",
                    "required": true,
                  },
          },
      "children": {
            "accepts": [
                    "text",
                    "phrasingElement",
                  ],
            "minItems": 1,
          },
    },
  "paragraph": {
      "kind": "paragraph",
      "children": {
            "accepts": [
                    "text",
                    "phrasingElement",
                  ],
            "minItems": 1,
          },
    },
  "text": {
      "kind": "text",
      "fields": {
            "value": {
                    "type": "string",
                    "required": true,
                  },
          },
    },
  "requirement": {
      "kind": "requirement",
      "fields": {
            "requirementId": {
                    "type": "string",
                    "required": true,
                  },
          },
      "children": {
            "accepts": [
                    "paragraph",
                    "note",
                    "example",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "note": {
      "kind": "note",
      "fields": {
            "tone": {
                    "type": "string",
                  },
          },
      "children": {
            "accepts": [
                    "paragraph",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "example": {
      "kind": "example",
      "children": {
            "accepts": [
                    "heading",
                    "paragraph",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "issue": {
      "kind": "issue",
      "fields": {
            "issueId": {
                    "type": "string",
                    "required": true,
                  },
          },
      "children": {
            "accepts": [
                    "heading",
                    "paragraph",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "flowElement": {
      "kind": "flowElement",
      "fields": {
            "tagName": {
                    "type": "string",
                    "required": true,
                  },
            "attributes": {
                    "type": "record",
                    "valueTypes": [
                              "string",
                              "boolean",
                            ],
                  },
          },
      "children": {
            "accepts": [
                    "heading",
                    "section",
                    "paragraph",
                    "note",
                    "example",
                    "issue",
                    "requirement",
                    "flowElement",
                    "voidElement",
                  ],
          },
    },
  "phrasingElement": {
      "kind": "phrasingElement",
      "fields": {
            "tagName": {
                    "type": "string",
                    "required": true,
                  },
            "attributes": {
                    "type": "record",
                    "valueTypes": [
                              "string",
                              "boolean",
                            ],
                  },
          },
      "children": {
            "accepts": [
                    "text",
                    "phrasingElement",
                  ],
          },
    },
  "voidElement": {
      "kind": "voidElement",
      "fields": {
            "tagName": {
                    "type": "string",
                    "required": true,
                  },
            "attributes": {
                    "type": "record",
                    "valueTypes": [
                              "string",
                              "boolean",
                            ],
                  },
          },
    },
} as const satisfies NodeSchemaMap;

import type { CanonicalDocumentAst, Provenance } from "@spectotal/ast";
import {
  children,
  createProfileSchema,
  defineProfileSchemaSource,
  group,
  node,
  optional,
  recordOf,
  required,
} from "@spectotal/ast-schema";
import { describe, expect, it } from "vitest";

import { validateCanonicalAst } from "../src/index.js";

const provenance = (reason: string): Provenance => ({
  kind: "synthetic",
  reason,
});

const schema = createProfileSchema(
  defineProfileSchemaSource({
    profileId: "test",
    rootKind: "document",
    groups: {
      phrasingContent: group(["text", "phrasingElement"]),
      flowContent: group(["paragraph", "flowElement", "voidElement"]),
      documentContent: group(["paragraph", "flowElement", "voidElement"]),
    },
    nodes: {
      document: node({
        children: children("documentContent", { minItems: 1 }),
      }),
      paragraph: node({
        children: children("phrasingContent", { minItems: 1 }),
      }),
      text: node({
        fields: {
          value: required("string"),
        },
      }),
      phrasingElement: node({
        fields: {
          tagName: required("string"),
          attributes: optional(recordOf(["string", "boolean"])),
        },
        children: children("phrasingContent"),
      }),
      flowElement: node({
        fields: {
          tagName: required("string"),
          attributes: optional(recordOf(["string", "boolean"])),
        },
        children: children("flowContent"),
      }),
      voidElement: node({
        fields: {
          tagName: required("string"),
          attributes: optional(recordOf(["string", "boolean"])),
        },
      }),
    },
  }),
);

function textNode(id: string, value: string) {
  return {
    kind: "text",
    id,
    value,
    provenance: provenance(`text:${id}`),
  } as const;
}

function createValidAst(): CanonicalDocumentAst {
  return {
    profileId: "test",
    version: "1",
    root: {
      kind: "document",
      id: "root",
      provenance: provenance("root"),
      children: [
        {
          kind: "paragraph",
          id: "intro",
          provenance: provenance("intro"),
          children: [
            textNode("intro-text", "Intro"),
            {
              kind: "phrasingElement",
              id: "intro-mark",
              tagName: "x-inline",
              attributes: {
                title: "Custom inline element",
                hidden: true,
              },
              provenance: provenance("intro-mark"),
              children: [textNode("intro-mark-text", "Marked")],
            },
          ],
        },
        {
          kind: "flowElement",
          id: "custom-block",
          tagName: "x-note",
          attributes: {
            class: "callout",
          },
          provenance: provenance("custom-block"),
          children: [
            {
              kind: "paragraph",
              id: "custom-block-paragraph",
              provenance: provenance("custom-block-paragraph"),
              children: [textNode("custom-block-text", "Custom block")],
            },
          ],
        },
      ],
    },
  };
}

describe("validateCanonicalAst", () => {
  it("accepts arbitrary tag names on generated element node kinds", () => {
    const result = validateCanonicalAst(createValidAst(), schema);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects flow elements inside phrasing-only parents", () => {
    const invalidAst: CanonicalDocumentAst = {
      ...createValidAst(),
      root: {
        ...createValidAst().root,
        children: [
          {
            kind: "paragraph",
            id: "broken-paragraph",
            provenance: provenance("broken-paragraph"),
            children: [
              {
                kind: "flowElement",
                id: "bad-flow",
                tagName: "div",
                provenance: provenance("bad-flow"),
                children: [],
              },
            ],
          },
        ],
      },
    };

    const result = validateCanonicalAst(invalidAst, schema);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalid_child_kind",
    );
  });

  it("rejects void elements that define children", () => {
    const invalidAst: CanonicalDocumentAst = {
      ...createValidAst(),
      root: {
        ...createValidAst().root,
        children: [
          {
            kind: "voidElement",
            id: "bad-void",
            tagName: "img",
            provenance: provenance("bad-void"),
            children: [textNode("bad-void-text", "unexpected")],
          },
        ],
      },
    };

    const result = validateCanonicalAst(invalidAst, schema);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "unexpected_children",
    );
  });

  it("rejects non-string and non-boolean attribute values", () => {
    const invalidAst: CanonicalDocumentAst = {
      ...createValidAst(),
      root: {
        ...createValidAst().root,
        children: [
          {
            kind: "flowElement",
            id: "bad-attrs",
            tagName: "aside",
            attributes: {
              tabIndex: 1,
            },
            provenance: provenance("bad-attrs"),
            children: [],
          },
        ],
      },
    };

    const result = validateCanonicalAst(invalidAst, schema);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalid_field_type",
    );
    expect(
      result.issues.find((issue) => issue.code === "invalid_field_type")?.path,
    ).toEqual(["root", "children", 0, "attributes", "tabIndex"]);
  });
});

import type {
  CanonicalAstNode,
  CanonicalDocumentAst,
  Provenance,
} from "@spectotal/ast";
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

import { applyPatches, type AstPatch } from "../src/index.js";

const provenance = (reason: string): Provenance => ({
  kind: "synthetic",
  reason,
});

const schema = createProfileSchema(
  defineProfileSchemaSource({
    profileId: "test",
    rootKind: "document",
    nodes: {
      document: {
        children: { accepts: ["paragraph", "section", "note"], minItems: 1 },
      },
      section: {
        children: { accepts: ["paragraph", "note"], minItems: 1 },
      },
      paragraph: {
        children: { accepts: ["text"], minItems: 1 },
      },
      note: {
        children: { accepts: ["paragraph"], minItems: 1 },
      },
      text: {
        fields: {
          value: { type: "string", required: true },
        },
      },
    },
  }),
);

const richTextSchema = createProfileSchema(
  defineProfileSchemaSource({
    profileId: "rich-text",
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

function textNode(id: string, value: string): CanonicalAstNode {
  return {
    kind: "text",
    id,
    value,
    provenance: provenance(`text:${value}`),
  };
}

function paragraph(id: string, value: string): CanonicalAstNode {
  return {
    kind: "paragraph",
    id,
    provenance: provenance(`paragraph:${id}`),
    children: [textNode(`${id}-text`, value)],
  };
}

function note(id: string, value: string): CanonicalAstNode {
  return {
    kind: "note",
    id,
    provenance: provenance(`note:${id}`),
    children: [paragraph(`${id}-paragraph`, value)],
  };
}

function section(
  id: string,
  ...children: CanonicalAstNode[]
): CanonicalAstNode {
  return {
    kind: "section",
    id,
    provenance: provenance(`section:${id}`),
    children,
  };
}

function createAst(): CanonicalDocumentAst {
  return {
    profileId: "test",
    version: "1",
    root: {
      kind: "document",
      id: "root",
      provenance: provenance("document"),
      children: [
        paragraph("intro", "Intro"),
        section(
          "section-1",
          paragraph("section-para-1", "One"),
          paragraph("section-para-2", "Two"),
        ),
      ],
    },
  };
}

function richTextNode(id: string, value: string): CanonicalAstNode {
  return {
    kind: "text",
    id,
    value,
    provenance: provenance(`rich-text:${id}`),
  };
}

function richParagraph(
  id: string,
  ...children: CanonicalAstNode[]
): CanonicalAstNode {
  return {
    kind: "paragraph",
    id,
    provenance: provenance(`rich-paragraph:${id}`),
    children,
  };
}

function phrasingElement(
  id: string,
  tagName: string,
  ...children: CanonicalAstNode[]
): CanonicalAstNode {
  return {
    kind: "phrasingElement",
    id,
    tagName,
    attributes: {
      class: "inline",
    },
    provenance: provenance(`phrasing:${id}`),
    children,
  };
}

function flowElement(
  id: string,
  tagName: string,
  ...children: CanonicalAstNode[]
): CanonicalAstNode {
  return {
    kind: "flowElement",
    id,
    tagName,
    attributes: {
      hidden: true,
    },
    provenance: provenance(`flow:${id}`),
    children,
  };
}

function voidElement(
  id: string,
  tagName: string,
  overrides: Partial<CanonicalAstNode> = {},
): CanonicalAstNode {
  return {
    kind: "voidElement",
    id,
    tagName,
    provenance: provenance(`void:${id}`),
    ...overrides,
  };
}

function createRichTextAst(): CanonicalDocumentAst {
  return {
    profileId: "rich-text",
    version: "1",
    root: {
      kind: "document",
      id: "rich-root",
      provenance: provenance("rich-root"),
      children: [
        richParagraph("rich-intro", richTextNode("rich-intro-text", "Intro")),
      ],
    },
  };
}

describe("applyPatches", () => {
  it("applies insert, replace, and remove sequentially without mutating the input AST", () => {
    const ast = createAst();
    const patches: readonly AstPatch[] = [
      {
        op: "insert",
        target: {
          at: "before",
          node: { by: "nodeId", nodeId: "section-para-2" },
        },
        nodes: [note("inserted-note", "Inserted")],
      },
      {
        op: "replace",
        target: { by: "path", path: [0] },
        nodes: [paragraph("intro-updated", "Updated intro")],
      },
      {
        op: "remove",
        target: { by: "nodeId", nodeId: "section-para-1" },
      },
    ];

    const result = applyPatches(ast, schema, patches);

    expect(result.changed).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(ast.root.children?.[0]?.id).toBe("intro");
    expect(result.ast.root.children?.[0]?.id).toBe("intro-updated");
    expect(
      result.ast.root.children?.[1]?.children?.map((child) => child.id),
    ).toEqual(["inserted-note", "section-para-2"]);
  });

  it("supports parent insertion at an explicit index", () => {
    const ast = createAst();

    const result = applyPatches(ast, schema, [
      {
        op: "insert",
        target: {
          at: "index",
          parent: { by: "nodeId", nodeId: "section-1" },
          index: 1,
        },
        nodes: [note("middle-note", "Middle")],
      },
    ]);

    expect(result.changed).toBe(true);
    expect(
      result.ast.root.children?.[1]?.children?.map((child) => child.id),
    ).toEqual(["section-para-1", "middle-note", "section-para-2"]);
  });

  it("reports invalid root removal and invalid indexes while leaving the AST unchanged", () => {
    const ast = createAst();

    const result = applyPatches(ast, schema, [
      {
        op: "remove",
        target: { by: "path", path: [] },
      },
      {
        op: "insert",
        target: {
          at: "index",
          parent: { by: "nodeId", nodeId: "section-1" },
          index: 99,
        },
        nodes: [note("bad-index", "Bad index")],
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.ast).toEqual(ast);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "PATCH_ROOT_REMOVE_FORBIDDEN",
      "PATCH_INVALID_INDEX",
    ]);
  });

  it("rejects structurally invalid inserted nodes", () => {
    const ast = createAst();

    const result = applyPatches(ast, schema, [
      {
        op: "insert",
        target: {
          at: "end",
          parent: { by: "nodeId", nodeId: "intro" },
        },
        nodes: [
          {
            kind: "text",
            id: "bad-text",
          },
        ],
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
    expect(result.diagnostics[0]?.message).toContain(
      'Field "value" is required',
    );
  });

  it("rejects schema-invalid inserted child kinds", () => {
    const ast = createAst();

    const result = applyPatches(ast, schema, [
      {
        op: "insert",
        target: {
          at: "end",
          parent: { by: "nodeId", nodeId: "section-para-1" },
        },
        nodes: [note("illegal-note", "Illegal")],
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
    expect(result.diagnostics[0]?.message).toContain(
      'does not accept child kind "note"',
    );
  });

  it("rejects removals that violate child cardinality", () => {
    const ast = createAst();

    const result = applyPatches(ast, schema, [
      {
        op: "remove",
        target: { by: "nodeId", nodeId: "intro-text" },
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
    expect(result.diagnostics[0]?.message).toContain(
      "requires at least 1 children",
    );
  });

  it("requires exactly one structurally valid replacement root node", () => {
    const ast = createAst();

    const wrongArity = applyPatches(ast, schema, [
      {
        op: "replace",
        target: { by: "path", path: [] },
        nodes: [createAst().root, createAst().root],
      },
    ]);

    const invalidRoot = applyPatches(ast, schema, [
      {
        op: "replace",
        target: { by: "path", path: [] },
        nodes: [
          {
            kind: "document",
            id: "replacement-root",
            provenance: provenance("replacement-root"),
            children: [
              {
                kind: "text",
                id: "wrong-child",
                value: "Wrong root child",
                provenance: provenance("wrong-child"),
              },
            ],
          },
        ],
      },
    ]);

    const validRoot = applyPatches(ast, schema, [
      {
        op: "replace",
        target: { by: "path", path: [] },
        nodes: [
          {
            kind: "document",
            id: "replacement-root",
            provenance: provenance("replacement-root"),
            children: [paragraph("replacement-paragraph", "Replacement")],
          },
        ],
      },
    ]);

    expect(wrongArity.diagnostics[0]?.code).toBe(
      "PATCH_ROOT_REPLACE_REQUIRES_SINGLE_NODE",
    );
    expect(invalidRoot.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
    expect(validRoot.changed).toBe(true);
    expect(validRoot.ast.root.id).toBe("replacement-root");
  });

  it("treats empty inserts as no-ops", () => {
    const ast = createAst();

    const result = applyPatches(ast, schema, [
      {
        op: "insert",
        target: {
          at: "start",
          parent: { by: "nodeId", nodeId: "section-1" },
        },
        nodes: [],
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.ast).toEqual(ast);
  });

  it("allows phrasing element inserts into phrasing-only parents", () => {
    const ast = createRichTextAst();

    const result = applyPatches(ast, richTextSchema, [
      {
        op: "insert",
        target: {
          at: "end",
          parent: { by: "nodeId", nodeId: "rich-intro" },
        },
        nodes: [
          phrasingElement(
            "rich-inline",
            "span",
            richTextNode("rich-inline-text", "Inline"),
          ),
        ],
      },
    ]);

    expect(result.changed).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(
      result.ast.root.children?.[0]?.children?.map((child) => child.kind),
    ).toEqual(["text", "phrasingElement"]);
  });

  it("rejects flow element inserts into phrasing-only parents", () => {
    const ast = createRichTextAst();

    const result = applyPatches(ast, richTextSchema, [
      {
        op: "insert",
        target: {
          at: "end",
          parent: { by: "nodeId", nodeId: "rich-intro" },
        },
        nodes: [
          flowElement(
            "rich-block",
            "div",
            richParagraph(
              "rich-block-paragraph",
              richTextNode("rich-block-text", "Block"),
            ),
          ),
        ],
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
    expect(result.diagnostics[0]?.message).toContain(
      'does not accept child kind "flowElement"',
    );
  });

  it("rejects replacements with void elements that carry children", () => {
    const ast = createRichTextAst();

    const result = applyPatches(ast, richTextSchema, [
      {
        op: "replace",
        target: { by: "nodeId", nodeId: "rich-intro-text" },
        nodes: [
          voidElement("rich-image", "img", {
            children: [richTextNode("rich-image-text", "unexpected")],
          }),
        ],
      },
    ]);

    expect(result.changed).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
    expect(result.diagnostics[0]?.message).toContain(
      "does not accept children",
    );
  });
});

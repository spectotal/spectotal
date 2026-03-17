import type { CanonicalAstNode, CanonicalDocumentAst, Provenance } from "@spectotal/ast";
import type { ProfileSchema } from "@spectotal/ast-schema";
import { describe, expect, it } from "vitest";

import { applyPatches, type AstPatch } from "../src/index.js";

const provenance = (reason: string): Provenance => ({ kind: "synthetic", reason });

const schema: ProfileSchema = {
  profileId: "test",
  rootKind: "document",
  nodes: {
    document: {
      kind: "document",
      children: { accepts: ["paragraph", "section", "note"] },
    },
    section: {
      kind: "section",
      children: { accepts: ["paragraph", "note"] },
    },
    paragraph: {
      kind: "paragraph",
      children: { accepts: ["text"] },
    },
    note: {
      kind: "note",
      children: { accepts: ["paragraph"] },
    },
    text: {
      kind: "text",
    },
  },
};

function textNode(id: string, value: string): CanonicalAstNode {
  return {
    kind: "text",
    id,
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

function section(id: string, ...children: CanonicalAstNode[]): CanonicalAstNode {
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
    expect(result.ast.root.children?.[1]?.children?.map((child) => child.id)).toEqual([
      "inserted-note",
      "section-para-2",
    ]);
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
    expect(result.ast.root.children?.[1]?.children?.map((child) => child.id)).toEqual([
      "section-para-1",
      "middle-note",
      "section-para-2",
    ]);
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
  });

  it("requires exactly one schema-compatible replacement root node", () => {
    const ast = createAst();

    const wrongArity = applyPatches(ast, schema, [
      {
        op: "replace",
        target: { by: "path", path: [] },
        nodes: [createAst().root, createAst().root],
      },
    ]);

    const wrongKind = applyPatches(ast, schema, [
      {
        op: "replace",
        target: { by: "path", path: [] },
        nodes: [paragraph("not-document", "Wrong root")],
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

    expect(wrongArity.diagnostics[0]?.code).toBe("PATCH_ROOT_REPLACE_REQUIRES_SINGLE_NODE");
    expect(wrongKind.diagnostics[0]?.code).toBe("PATCH_SCHEMA_VIOLATION");
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
});

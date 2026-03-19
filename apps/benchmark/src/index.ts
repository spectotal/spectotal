import { performance } from "node:perf_hooks";

import type {
  CanonicalAstNode,
  CanonicalDocumentAst,
  Provenance,
} from "@spectotal/ast";
import { applyPatches, type AstPatch } from "@spectotal/ast-patch";
import { validateCanonicalAst } from "@spectotal/ast-validate";
import { w3cSchema } from "@spectotal/profile-w3c";

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

function textNode(id: string, value: string): CanonicalAstNode {
  return {
    kind: "text",
    id,
    value,
    provenance: synthetic(`text:${id}`),
  };
}

function paragraphNode(id: string, value: string): CanonicalAstNode {
  return {
    kind: "paragraph",
    id,
    provenance: synthetic(`paragraph:${id}`),
    children: [textNode(`${id}-text`, value)],
  };
}

function buildDocument(paragraphCount: number): CanonicalDocumentAst {
  return {
    profileId: "w3c",
    version: "benchmark-v1",
    root: {
      kind: "document",
      id: "benchmark-root",
      provenance: synthetic("document"),
      children: Array.from({ length: paragraphCount }, (_, index) =>
        paragraphNode(
          `paragraph-${String(index)}`,
          `Benchmark paragraph ${String(index)}`,
        ),
      ),
    },
  };
}

function buildPatches(): readonly AstPatch[] {
  return [
    {
      op: "replace",
      target: { by: "nodeId", nodeId: "paragraph-5" },
      nodes: [
        paragraphNode("paragraph-5-updated", "Updated benchmark paragraph 5"),
      ],
    },
    {
      op: "insert",
      target: {
        at: "after",
        node: { by: "nodeId", nodeId: "paragraph-10" },
      },
      nodes: [
        paragraphNode("paragraph-10-inserted", "Inserted benchmark paragraph"),
      ],
    },
  ];
}

function measure(
  label: string,
  iterations: number,
  fn: () => void,
): {
  readonly label: string;
  readonly totalMs: number;
  readonly averageMs: number;
} {
  const startedAt = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    fn();
  }

  const totalMs = performance.now() - startedAt;
  return {
    label,
    totalMs,
    averageMs: totalMs / iterations,
  };
}

function main(): void {
  const ast = buildDocument(50);
  const patches = buildPatches();

  const validation = measure("validateCanonicalAst", 500, () => {
    validateCanonicalAst(ast, w3cSchema);
  });

  const patching = measure("applyPatches", 500, () => {
    applyPatches(ast, w3cSchema, patches);
  });

  console.log(
    JSON.stringify(
      {
        profileId: ast.profileId,
        paragraphCount: ast.root.children?.length ?? 0,
        patchCount: patches.length,
        benchmarks: [validation, patching],
      },
      null,
      2,
    ),
  );
}

main();

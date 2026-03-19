// Verified through apps/playground/tsconfig.verify.json against built package exports.
import type { CanonicalDocumentAst, Provenance } from "@spectotal/ast";
import { applyPatches, type AstPatch } from "@spectotal/ast-patch";
import { validateCanonicalAst } from "@spectotal/ast-validate";
import { w3cSchema } from "@spectotal/profile-w3c";

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

const ast: CanonicalDocumentAst = {
  profileId: "w3c",
  version: "example-v1",
  root: {
    kind: "document",
    id: "patch-root",
    provenance: synthetic("document"),
    children: [
      {
        kind: "paragraph",
        id: "intro",
        provenance: synthetic("paragraph"),
        children: [
          {
            kind: "text",
            id: "intro-text",
            value: "Before patch",
            provenance: synthetic("text"),
          },
        ],
      },
    ],
  },
};

const patches: readonly AstPatch[] = [
  {
    op: "replace",
    target: { by: "nodeId", nodeId: "intro" },
    nodes: [
      {
        kind: "paragraph",
        id: "intro-updated",
        provenance: synthetic("paragraph-updated"),
        children: [
          {
            kind: "text",
            id: "intro-updated-text",
            value: "After patch",
            provenance: synthetic("text-updated"),
          },
        ],
      },
    ],
  },
];

const result = applyPatches(ast, w3cSchema, patches);

console.log(
  JSON.stringify(
    {
      patchDiagnostics: result.diagnostics,
      validationAfterPatch: validateCanonicalAst(result.ast, w3cSchema),
      updatedRootChildren:
        result.ast.root.children?.map((child) => child.id) ?? [],
    },
    null,
    2,
  ),
);

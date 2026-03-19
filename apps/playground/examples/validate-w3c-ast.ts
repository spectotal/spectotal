// Verified through apps/playground/tsconfig.verify.json against built package exports.
import type { CanonicalDocumentAst, Provenance } from "@spectotal/ast";
import { validateCanonicalAst } from "@spectotal/ast-validate";
import { validateW3cDocument, w3cSchema } from "@spectotal/profile-w3c";

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

const ast: CanonicalDocumentAst = {
  profileId: "w3c",
  version: "example-v1",
  root: {
    kind: "document",
    id: "example-root",
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
            value:
              "Generated W3C validators now back canonical AST validation.",
            provenance: synthetic("text"),
          },
        ],
      },
    ],
  },
};

console.log(
  JSON.stringify(
    {
      sharedValidatorResult: validateCanonicalAst(ast, w3cSchema),
      generatedValidatorIssues: validateW3cDocument(ast),
    },
    null,
    2,
  ),
);

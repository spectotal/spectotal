import type {
  AstNode,
  AstPath,
  CanonicalAstNode,
  CanonicalDocumentAst,
  DraftDocumentAst,
  Provenance,
} from "@spectotal/ast";
import { applyPatches, type AstPatch } from "@spectotal/ast-patch";
import { findAll, findFirst, visit } from "@spectotal/ast-query";
import { validateCanonicalAst } from "@spectotal/ast-validate";
import {
  validateW3cDocument,
  w3cNodeSchemas,
  w3cSchema,
} from "@spectotal/profile-w3c";

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

function textNode(id: string, value: string): AstNode {
  return {
    kind: "text",
    id,
    value,
    provenance: synthetic(`value=${value}`),
  };
}

function paragraph(id: string, value: string): AstNode {
  return {
    kind: "paragraph",
    id,
    children: [textNode(`${id}-text`, value)],
  };
}

export const draftDocumentAst: DraftDocumentAst = {
  profileId: "w3c",
  root: {
    kind: "document",
    id: "sample-draft",
    provenance: synthetic("shortName=sample-draft; status=exploration"),
    children: [
      paragraph(
        "intro-paragraph",
        "This draftDocumentAst is a playground sample for API exploration.",
      ),
      // {
      //   kind: "section",
      //   id: "section-introduction",
      //   children: [
      //     heading("heading-introduction", 1, "Introduction"),
      //     paragraph(
      //       "introduction-paragraph",
      //       "The introduction section shows a basic paragraph child.",
      //     ),
      //     {
      //       kind: "note",
      //       id: "intro-note",
      //       provenance: synthetic("tone=informative"),
      //       children: [
      //         paragraph(
      //           "intro-note-paragraph",
      //           "Notes can be nested inside sections with their own paragraph content.",
      //         ),
      //       ],
      //     },
      //   ],
      // },
      // {
      //   kind: "section",
      //   id: "section-conformance",
      //   children: [
      //     heading("heading-conformance", 1, "Conformance"),
      //     paragraph(
      //       "conformance-paragraph",
      //       "This section includes requirement, example, and nested section nodes.",
      //     ),
      //     {
      //       kind: "requirement",
      //       id: "REQ-1",
      //       children: [
      //         paragraph(
      //           "requirement-paragraph",
      //           "Consumers MUST support draft AST traversal before canonical normalization.",
      //         ),
      //       ],
      //     },
      //     {
      //       kind: "example",
      //       id: "example-tree",
      //       children: [
      //         heading("example-tree-heading", 2, "Example tree"),
      //         paragraph(
      //           "example-tree-paragraph",
      //           "An example can hold explanatory paragraph content.",
      //         ),
      //       ],
      //     },
      //     {
      //       kind: "section",
      //       id: "section-definitions",
      //       children: [
      //         heading("heading-definitions", 2, "Definitions"),
      //         paragraph(
      //           "definitions-paragraph",
      //           "Nested sections are represented directly in the draft tree.",
      //         ),
      //       ],
      //     },
      //   ],
      // },
      // {
      //   kind: "issue",
      //   id: "ISSUE-1",
      //   children: [
      //     heading("issue-heading", 1, "Open API question"),
      //     paragraph(
      //       "issue-paragraph",
      //       "Should draft nodes eventually carry explicit provenance metadata?",
      //     ),
      //   ],
      // },
    ],
  },
};

function toCanonicalNode(node: AstNode, reason: string): CanonicalAstNode {
  const { children: draftChildren, provenance, ...rest } = node;
  const children = draftChildren?.map((child, index) =>
    toCanonicalNode(child, `${reason}/children/${index}`),
  );

  return {
    ...rest,
    provenance: provenance ?? synthetic(reason),
    ...(children ? { children } : {}),
  };
}

function buildCanonicalDocument(): CanonicalDocumentAst {
  return {
    profileId: draftDocumentAst.profileId,
    version: "draft-ast-playground-v1",
    root: toCanonicalNode(draftDocumentAst.root, "canonicalized/root"),
  };
}

function findPathById(root: AstNode, targetId: string): AstPath | undefined {
  let found: AstPath | undefined;

  visit(root, (node, path) => {
    if (!found && node.id === targetId) {
      found = path;
    }
  });

  return found;
}

function canonicalParagraph(
  id: string,
  value: string,
  reason: string,
): CanonicalAstNode {
  return toCanonicalNode(paragraph(id, value), reason);
}

function canonicalNote(
  id: string,
  value: string,
  reason: string,
): CanonicalAstNode {
  return toCanonicalNode(
    {
      kind: "note",
      id,
      children: [paragraph(`${id}-paragraph`, value)],
    },
    reason,
  );
}

function buildQuerySummary() {
  const firstSection = findFirst(draftDocumentAst.root, { kind: "section" });
  const paragraphIds = findAll(draftDocumentAst.root, {
    kind: "paragraph",
  }).map((node) => node.id ?? null);
  const noteIds = findAll(draftDocumentAst.root, { kind: "note" }).map(
    (node) => node.id ?? null,
  );
  const issueParagraphPath =
    findPathById(draftDocumentAst.root, "issue-paragraph") ?? null;
  let headingCount = 0;

  visit(draftDocumentAst.root, (node) => {
    if (node.kind === "heading") headingCount += 1;
  });

  return {
    firstSectionId: firstSection?.id ?? null,
    paragraphIds,
    noteIds,
    issueParagraphPath,
    headingCount,
  };
}

function buildValidPatches(): readonly AstPatch[] {
  return [
    {
      op: "insert",
      target: {
        at: "end",
        parent: { by: "nodeId", nodeId: "intro-paragraph" },
      },
      nodes: [
        canonicalNote(
          "conformance-patch-note",
          "Patched notes can be inserted into the conformance section.",
          "patches/valid/insert-note",
        ),
      ],
    },
    {
      op: "replace",
      target: { by: "path", path: [3, 1] },
      nodes: [
        canonicalParagraph(
          "issue-paragraph-updated",
          "The open API question now tracks the reduced ast-patch contract.",
          "patches/valid/replace-issue-paragraph",
        ),
      ],
    },
    {
      op: "remove",
      target: { by: "path", path: [1, 2, 0] },
    },
  ];
}

function buildInvalidPatches(): readonly AstPatch[] {
  return [
    {
      op: "remove",
      target: { by: "path", path: [] },
    },
    {
      op: "insert",
      target: {
        at: "index",
        parent: { by: "nodeId", nodeId: "section-conformance" },
        index: 99,
      },
      nodes: [
        canonicalParagraph(
          "out-of-range-insert",
          "This patch should fail because the insert index is invalid.",
          "patches/invalid/out-of-range-insert",
        ),
      ],
    },
  ];
}

export default async function run(): Promise<unknown> {
  const canonicalBefore = buildCanonicalDocument();
  const validPatches = buildValidPatches();
  const invalidPatches = buildInvalidPatches();
  const canonicalValidation = validateCanonicalAst(canonicalBefore, w3cSchema);
  const generatedValidationIssues = validateW3cDocument(canonicalBefore);

  return {
    draft: draftDocumentAst,
    queries: buildQuerySummary(),
    canonicalBefore,
    canonicalValidation,
    generatedValidationIssues,
    rootAcceptsKinds: w3cNodeSchemas.document.children?.accepts ?? [],
    validPatches,
    validResult: applyPatches(canonicalBefore, w3cSchema, validPatches),
    invalidPatches,
    invalidResult: applyPatches(canonicalBefore, w3cSchema, invalidPatches),
  };
}

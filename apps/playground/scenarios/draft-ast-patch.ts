import type {
  AstNode,
  AstPath,
  CanonicalAstNode,
  CanonicalDocumentAst,
  DraftDocumentAst,
  Provenance,
} from "@spectotal/ast";
import { applyPatches, type AstPatch } from "@spectotal/ast-patch";
import { findFirst, visit } from "@spectotal/ast-query";
import { validateCanonicalAst } from "@spectotal/ast-validate";
import {
  validateW3cNode,
  type W3cDocumentNode,
  type W3cParagraphNode,
  type W3cTextNode,
  w3cSchema,
} from "@spectotal/profile-w3c";

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

function textNode(id: string, value: string): W3cTextNode {
  return {
    kind: "text",
    id,
    value,
    provenance: synthetic(`text:${value}`),
  };
}

function paragraphNode(id: string, value: string): W3cParagraphNode {
  return {
    kind: "paragraph",
    id,
    provenance: synthetic(`paragraph:${id}`),
    children: [textNode(`${id}-text`, value)],
  };
}

const draftRoot: W3cDocumentNode = {
  kind: "document",
  id: "draft-root",
  provenance: synthetic("draft-root"),
  children: [
    paragraphNode("intro", "Generated schema bundles drive this scenario."),
  ],
};

const draftDocumentAst: DraftDocumentAst = {
  profileId: "w3c",
  root: draftRoot,
};

function toCanonicalNode(node: AstNode, reason: string): CanonicalAstNode {
  const { children, provenance, ...rest } = node;
  const nextChildren = children?.map((child, index) =>
    toCanonicalNode(child, `${reason}/children/${index}`),
  );

  return {
    ...rest,
    provenance: provenance ?? synthetic(reason),
    ...(nextChildren ? { children: nextChildren } : {}),
  };
}

function toCanonicalDocument(draft: DraftDocumentAst): CanonicalDocumentAst {
  return {
    profileId: draft.profileId,
    version: "draft-ast-patch-v1",
    root: toCanonicalNode(draft.root, "canonical/root"),
  };
}

function findPathById(root: AstNode, targetId: string): AstPath | undefined {
  let found: AstPath | undefined;

  visit(root, (node, path) => {
    if (!found && node.id === targetId) found = path;
  });

  return found;
}

export default async function run(): Promise<unknown> {
  const canonicalBefore = toCanonicalDocument(draftDocumentAst);
  const patches: readonly AstPatch[] = [
    {
      op: "replace",
      target: { by: "nodeId", nodeId: "intro" },
      nodes: [
        {
          kind: "paragraph",
          id: "intro-updated",
          provenance: synthetic("intro-updated"),
          children: [
            textNode(
              "intro-updated-text",
              "Patch validation now uses the generated W3C schema bundle.",
            ),
          ],
        },
      ],
    },
  ];
  const patchResult = applyPatches(canonicalBefore, w3cSchema, patches);

  return {
    draftDocumentAst,
    paragraphPath: findPathById(draftDocumentAst.root, "intro") ?? null,
    firstParagraph: findFirst(draftDocumentAst.root, { kind: "paragraph" }),
    directNodeValidation: validateW3cNode(draftDocumentAst.root.children?.[0]),
    canonicalValidationBefore: validateCanonicalAst(canonicalBefore, w3cSchema),
    patches,
    patchResult,
    canonicalValidationAfter: validateCanonicalAst(patchResult.ast, w3cSchema),
  };
}

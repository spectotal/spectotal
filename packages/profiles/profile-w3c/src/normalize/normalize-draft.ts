import type {
  AstNode,
  CanonicalAstNode,
  CanonicalDocumentAst,
  CompilePlan,
  DraftDocumentAst,
  Provenance,
} from "@spectotal/ast";

const HEADING_ASSEMBLY_CONTAINERS = new Set([
  "document",
  "section",
  "flowElement",
]);

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

function toCanonicalNode(
  node: AstNode,
  reason: string,
  childAssembler?: (
    children: readonly AstNode[],
  ) => readonly CanonicalAstNode[],
): CanonicalAstNode {
  const { children, provenance, ...rest } = node;
  const nextChildren = children
    ? (childAssembler?.(children) ??
      children.map((child, index) =>
        toCanonicalNode(child, `${reason}/children/${index}`),
      ))
    : undefined;

  return {
    ...rest,
    provenance: provenance ?? synthetic(reason),
    ...(nextChildren ? { children: nextChildren } : {}),
  };
}

function headingLevel(node: AstNode): number | undefined {
  return node.kind === "heading" && typeof node.level === "number"
    ? node.level
    : undefined;
}

function assembleFlow(
  children: readonly AstNode[],
  reason: string,
): readonly CanonicalAstNode[] {
  const rootChildren: CanonicalAstNode[] = [];
  const stack: Array<{ level: number; section: CanonicalAstNode }> = [];

  for (const [index, child] of children.entries()) {
    const level = headingLevel(child);

    if (level !== undefined) {
      while (stack.length > 0 && stack.at(-1)!.level >= level) {
        stack.pop();
      }

      const sectionReason = `${reason}/section-${index}`;
      const sectionChildren: CanonicalAstNode[] = [
        toCanonicalNode(
          child,
          `${sectionReason}/heading`,
          HEADING_ASSEMBLY_CONTAINERS.has(child.kind)
            ? (nestedChildren) =>
                assembleFlow(nestedChildren, `${sectionReason}/heading`)
            : undefined,
        ),
      ];
      const section: CanonicalAstNode = {
        kind: "section",
        provenance: child.provenance ?? synthetic(sectionReason),
        children: sectionChildren,
      };
      const parentChildren =
        stack.length > 0
          ? ((stack.at(-1)!.section.children ?? []) as CanonicalAstNode[])
          : rootChildren;

      parentChildren.push(section);
      stack.push({ level, section });
      continue;
    }

    const canonicalChild = toCanonicalNode(
      child,
      `${reason}/node-${index}`,
      HEADING_ASSEMBLY_CONTAINERS.has(child.kind)
        ? (nestedChildren) =>
            assembleFlow(nestedChildren, `${reason}/node-${index}`)
        : undefined,
    );
    const parentChildren =
      stack.length > 0
        ? ((stack.at(-1)!.section.children ?? []) as CanonicalAstNode[])
        : rootChildren;

    parentChildren.push(canonicalChild);
  }

  return rootChildren;
}

export async function normalizeW3cDraftDocument(
  ast: DraftDocumentAst,
  _plan: CompilePlan,
): Promise<CanonicalDocumentAst> {
  console.log("normalise plan", _plan);
  return {
    profileId: ast.profileId,
    version: "w3c-markdown-v1",
    root: {
      kind: ast.root.kind,
      provenance: ast.root.provenance ?? synthetic("w3c-normalize/root"),
      ...(ast.root.id ? { id: ast.root.id } : {}),
      children: assembleFlow(ast.root.children ?? [], "w3c-normalize/root"),
    },
  };
}

import type { AstNode, AstPath } from "@spectotal/ast";

export interface NodeSelector {
  readonly kind?: string;
  readonly propEquals?: Readonly<Record<string, unknown>>;
}

export function visit(node: AstNode, visitor: (node: AstNode, path: AstPath) => void, path: AstPath = []): void {
  visitor(node, path);
  for (const [slotName, children] of Object.entries(node.slots ?? {})) {
    children.forEach((child, index) => visit(child, visitor, [...path, slotName, index]));
  }
}

export function findFirst(root: AstNode, selector: NodeSelector): AstNode | undefined {
  let found: AstNode | undefined;
  visit(root, (node) => {
    if (found) return;
    const matchesKind = selector.kind ? node.kind === selector.kind : true;
    const matchesProps = selector.propEquals
      ? Object.entries(selector.propEquals).every(([key, value]) => node.props?.[key] === value)
      : true;
    if (matchesKind && matchesProps) found = node;
  });
  return found;
}

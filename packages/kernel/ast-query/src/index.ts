import type { AstNode, AstPath } from "@spectotal/ast";

export interface NodeSelector<TNode extends AstNode = AstNode> {
  readonly kind?: string;
  readonly id?: string;
  readonly where?: (node: TNode, path: AstPath) => boolean;
}

export function visit(
  node: AstNode,
  visitor: (node: AstNode, path: AstPath) => void,
  path: AstPath = [],
): void {
  visitor(node, path);
  node.children?.forEach((child, index) => {
    visit(child, visitor, [...path, index]);
  });
}

export function matches<TNode extends AstNode = AstNode>(
  node: TNode,
  selector: NodeSelector<TNode>,
  path: AstPath,
): boolean {
  if (selector.kind && node.kind !== selector.kind) return false;
  if (selector.id && node.id !== selector.id) return false;
  if (selector.where && !selector.where(node, path)) return false;
  return true;
}

export function findFirst<TNode extends AstNode = AstNode>(
  root: TNode,
  selector: NodeSelector<TNode>,
): TNode | undefined {
  let found: TNode | undefined;

  visit(root, (node, path) => {
    if (found) return;
    if (matches(node as TNode, selector, path)) {
      found = node as TNode;
    }
  });

  return found;
}

export function findAll<TNode extends AstNode = AstNode>(
  root: TNode,
  selector: NodeSelector<TNode>,
): readonly TNode[] {
  const results: TNode[] = [];

  visit(root, (node, path) => {
    if (matches(node as TNode, selector, path)) {
      results.push(node as TNode);
    }
  });

  return results;
}

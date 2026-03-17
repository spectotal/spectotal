import type { AstNode, AstPath, CanonicalAstNode, CanonicalDocumentAst, NodeId } from "@spectotal/ast";
import { acceptsChild, getNodeSchema, type ProfileSchema } from "@spectotal/ast-schema";

export type NodeRef =
  | { readonly by: "path"; readonly path: AstPath }
  | { readonly by: "nodeId"; readonly nodeId: NodeId };

export type InsertTarget =
  | { readonly at: "start"; readonly parent: NodeRef }
  | { readonly at: "end"; readonly parent: NodeRef }
  | { readonly at: "index"; readonly parent: NodeRef; readonly index: number }
  | { readonly at: "before"; readonly node: NodeRef }
  | { readonly at: "after"; readonly node: NodeRef };

export type AstPatch =
  | {
      readonly op: "insert";
      readonly target: InsertTarget;
      readonly nodes: readonly AstNode[];
    }
  | {
      readonly op: "replace";
      readonly target: NodeRef;
      readonly nodes: readonly AstNode[];
    }
  | {
      readonly op: "remove";
      readonly target: NodeRef;
    };

export type PatchDiagnosticCode =
  | "PATCH_TARGET_NOT_FOUND"
  | "PATCH_INVALID_INDEX"
  | "PATCH_ROOT_REMOVE_FORBIDDEN"
  | "PATCH_ROOT_REPLACE_REQUIRES_SINGLE_NODE"
  | "PATCH_SCHEMA_VIOLATION";

export interface PatchDiagnostic {
  readonly severity: "error" | "warning";
  readonly code: PatchDiagnosticCode;
  readonly message: string;
  readonly patchIndex: number;
}

export interface PatchApplyResult {
  readonly ast: CanonicalDocumentAst;
  readonly diagnostics: readonly PatchDiagnostic[];
  readonly changed: boolean;
}

interface ResolvedNodeRef {
  readonly node: CanonicalAstNode;
  readonly path: AstPath;
  readonly parent?: CanonicalAstNode;
  readonly parentPath?: AstPath;
  readonly indexInParent?: number;
}

function createDiagnostic(
  code: PatchDiagnosticCode,
  patchIndex: number,
  message: string
): PatchDiagnostic {
  return {
    severity: "error",
    code,
    message,
    patchIndex,
  };
}

function getChildren(node: CanonicalAstNode): readonly CanonicalAstNode[] {
  return node.children ?? [];
}

function toCanonicalNodes(nodes: readonly AstNode[]): readonly CanonicalAstNode[] {
  return nodes as readonly CanonicalAstNode[];
}

function resolveNodeByPath(root: CanonicalAstNode, path: AstPath): ResolvedNodeRef | undefined {
  let node = root;
  let parent: CanonicalAstNode | undefined;
  let parentPath: AstPath | undefined;

  for (let depth = 0; depth < path.length; depth += 1) {
    const index = path[depth];
    if (!Number.isInteger(index) || index < 0) return undefined;

    const child = getChildren(node)[index];
    if (!child) return undefined;

    parent = node;
    parentPath = path.slice(0, depth);
    node = child;
  }

  return {
    node,
    path,
    ...(parent ? { parent } : {}),
    ...(parentPath === undefined ? {} : { parentPath }),
    ...(path.length === 0 ? {} : { indexInParent: path[path.length - 1] }),
  };
}

function resolveNodeById(
  node: CanonicalAstNode,
  nodeId: NodeId,
  path: AstPath = [],
  parent?: CanonicalAstNode,
  parentPath?: AstPath,
  indexInParent?: number
): ResolvedNodeRef | undefined {
  if (node.id === nodeId) {
    return {
      node,
      path,
      ...(parent ? { parent } : {}),
      ...(parentPath === undefined ? {} : { parentPath }),
      ...(indexInParent === undefined ? {} : { indexInParent }),
    };
  }

  const children = getChildren(node);
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const result = resolveNodeById(child, nodeId, [...path, index], node, path, index);
    if (result) return result;
  }

  return undefined;
}

function resolveNodeRef(root: CanonicalAstNode, ref: NodeRef): ResolvedNodeRef | undefined {
  return ref.by === "path" ? resolveNodeByPath(root, ref.path) : resolveNodeById(root, ref.nodeId);
}

function rewriteNodeAtPath(
  node: CanonicalAstNode,
  path: AstPath,
  rewrite: (node: CanonicalAstNode) => CanonicalAstNode
): CanonicalAstNode {
  if (path.length === 0) return rewrite(node);

  const [index, ...rest] = path;
  const children = getChildren(node);
  const nextChildren = children.slice();
  nextChildren[index] = rewriteNodeAtPath(children[index], rest, rewrite);

  return {
    ...node,
    children: nextChildren,
  };
}

function replaceChildrenAtPath(
  root: CanonicalAstNode,
  parentPath: AstPath,
  nextChildren: readonly CanonicalAstNode[]
): CanonicalAstNode {
  return rewriteNodeAtPath(root, parentPath, (node) => ({
    ...node,
    children: nextChildren,
  }));
}

function canAcceptChildren(
  schema: ProfileSchema,
  parent: CanonicalAstNode,
  children: readonly CanonicalAstNode[]
): boolean {
  const nodeSchema = getNodeSchema(schema, parent.kind);
  if (!nodeSchema?.children) return children.length === 0;
  return children.every((child) => acceptsChild(nodeSchema, child));
}

function createTargetNotFoundDiagnostic(patchIndex: number, ref: NodeRef): PatchDiagnostic {
  return createDiagnostic(
    "PATCH_TARGET_NOT_FOUND",
    patchIndex,
    ref.by === "path"
      ? `Patch target path ${JSON.stringify(ref.path)} was not found.`
      : `Patch target nodeId "${ref.nodeId}" was not found.`
  );
}

function applyInsertPatch(
  root: CanonicalAstNode,
  schema: ProfileSchema,
  patch: Extract<AstPatch, { op: "insert" }>,
  patchIndex: number
): { readonly root: CanonicalAstNode } | { readonly diagnostic: PatchDiagnostic } {
  if (patch.nodes.length === 0) {
    return { root };
  }

  const nodes = toCanonicalNodes(patch.nodes);

  if (patch.target.at === "before" || patch.target.at === "after") {
    const resolved = resolveNodeRef(root, patch.target.node);
    if (!resolved) {
      return { diagnostic: createTargetNotFoundDiagnostic(patchIndex, patch.target.node) };
    }

    if (!resolved.parent || resolved.parentPath === undefined || resolved.indexInParent === undefined) {
      return {
        diagnostic: createDiagnostic(
          "PATCH_SCHEMA_VIOLATION",
          patchIndex,
          "Cannot insert siblings before or after the document root."
        ),
      };
    }

    if (!canAcceptChildren(schema, resolved.parent, nodes)) {
      return {
        diagnostic: createDiagnostic(
          "PATCH_SCHEMA_VIOLATION",
          patchIndex,
          `Parent node "${resolved.parent.kind}" does not accept one or more inserted child kinds.`
        ),
      };
    }

    const siblings = getChildren(resolved.parent).slice();
    const insertIndex = patch.target.at === "before" ? resolved.indexInParent : resolved.indexInParent + 1;
    siblings.splice(insertIndex, 0, ...nodes);

    return {
      root: replaceChildrenAtPath(root, resolved.parentPath, siblings),
    };
  }

  const resolvedParent = resolveNodeRef(root, patch.target.parent);
  if (!resolvedParent) {
    return { diagnostic: createTargetNotFoundDiagnostic(patchIndex, patch.target.parent) };
  }

  const children = getChildren(resolvedParent.node);
  const insertIndex =
    patch.target.at === "start"
      ? 0
      : patch.target.at === "end"
        ? children.length
        : patch.target.index;

  if (!Number.isInteger(insertIndex) || insertIndex < 0 || insertIndex > children.length) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_INVALID_INDEX",
        patchIndex,
        `Insert index ${String(insertIndex)} is outside the valid range 0..${children.length}.`
      ),
    };
  }

  if (!canAcceptChildren(schema, resolvedParent.node, nodes)) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_SCHEMA_VIOLATION",
        patchIndex,
        `Parent node "${resolvedParent.node.kind}" does not accept one or more inserted child kinds.`
      ),
    };
  }

  const nextChildren = children.slice();
  nextChildren.splice(insertIndex, 0, ...nodes);

  return {
    root: replaceChildrenAtPath(root, resolvedParent.path, nextChildren),
  };
}

function applyReplacePatch(
  root: CanonicalAstNode,
  schema: ProfileSchema,
  patch: Extract<AstPatch, { op: "replace" }>,
  patchIndex: number
): { readonly root: CanonicalAstNode } | { readonly diagnostic: PatchDiagnostic } {
  const resolved = resolveNodeRef(root, patch.target);
  if (!resolved) {
    return { diagnostic: createTargetNotFoundDiagnostic(patchIndex, patch.target) };
  }

  if (patch.nodes.length === 0) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_SCHEMA_VIOLATION",
        patchIndex,
        "Replace patches require at least one replacement node."
      ),
    };
  }

  const nodes = toCanonicalNodes(patch.nodes);

  if (resolved.path.length === 0) {
    if (nodes.length !== 1) {
      return {
        diagnostic: createDiagnostic(
          "PATCH_ROOT_REPLACE_REQUIRES_SINGLE_NODE",
          patchIndex,
          "Replacing the document root requires exactly one replacement node."
        ),
      };
    }

    if (nodes[0].kind !== schema.rootKind) {
      return {
        diagnostic: createDiagnostic(
          "PATCH_SCHEMA_VIOLATION",
          patchIndex,
          `Replacement root kind "${nodes[0].kind}" does not match schema root kind "${schema.rootKind}".`
        ),
      };
    }

    return { root: nodes[0] };
  }

  if (!resolved.parent || resolved.parentPath === undefined || resolved.indexInParent === undefined) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_SCHEMA_VIOLATION",
        patchIndex,
        "Resolved replacement target is missing parent context."
      ),
    };
  }

  if (!canAcceptChildren(schema, resolved.parent, nodes)) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_SCHEMA_VIOLATION",
        patchIndex,
        `Parent node "${resolved.parent.kind}" does not accept one or more replacement child kinds.`
      ),
    };
  }

  const siblings = getChildren(resolved.parent).slice();
  siblings.splice(resolved.indexInParent, 1, ...nodes);

  return {
    root: replaceChildrenAtPath(root, resolved.parentPath, siblings),
  };
}

function applyRemovePatch(
  root: CanonicalAstNode,
  patch: Extract<AstPatch, { op: "remove" }>,
  patchIndex: number
): { readonly root: CanonicalAstNode } | { readonly diagnostic: PatchDiagnostic } {
  const resolved = resolveNodeRef(root, patch.target);
  if (!resolved) {
    return { diagnostic: createTargetNotFoundDiagnostic(patchIndex, patch.target) };
  }

  if (resolved.path.length === 0) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_ROOT_REMOVE_FORBIDDEN",
        patchIndex,
        "Removing the document root is forbidden."
      ),
    };
  }

  if (!resolved.parent || resolved.parentPath === undefined || resolved.indexInParent === undefined) {
    return {
      diagnostic: createDiagnostic(
        "PATCH_SCHEMA_VIOLATION",
        patchIndex,
        "Resolved removal target is missing parent context."
      ),
    };
  }

  const siblings = getChildren(resolved.parent).slice();
  siblings.splice(resolved.indexInParent, 1);

  return {
    root: replaceChildrenAtPath(root, resolved.parentPath, siblings),
  };
}

export function applyPatches(
  ast: CanonicalDocumentAst,
  schema: ProfileSchema,
  patches: readonly AstPatch[]
): PatchApplyResult {
  let nextAst = ast;
  let changed = false;
  const diagnostics: PatchDiagnostic[] = [];

  patches.forEach((patch, patchIndex) => {
    const result =
      patch.op === "insert"
        ? applyInsertPatch(nextAst.root, schema, patch, patchIndex)
        : patch.op === "replace"
          ? applyReplacePatch(nextAst.root, schema, patch, patchIndex)
          : applyRemovePatch(nextAst.root, patch, patchIndex);

    if ("diagnostic" in result) {
      diagnostics.push(result.diagnostic);
      return;
    }

    if (result.root !== nextAst.root) {
      nextAst = { ...nextAst, root: result.root };
      changed = true;
    }
  });

  return {
    ast: nextAst,
    diagnostics,
    changed,
  };
}

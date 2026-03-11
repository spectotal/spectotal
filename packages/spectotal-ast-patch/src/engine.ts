import type {
  Document,
  Workspace,
} from '@spectotal/core';
import type {
  AstNode,
  AstRoot,
  PatchApplyOptions,
  PatchContext,
  PatchError,
  PatchOperation,
  PatchResult,
} from './types.js';
import {
  isAstNode,
  walkAstNodes,
  type NodeVisit,
} from './walk.js';

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function makeError(params: {
  code: PatchError['code'];
  message: string;
  operation?: PatchOperation['op'];
  operationIndex?: number;
  path?: string;
  details?: unknown;
}): PatchError {
  return {
    code: params.code,
    message: params.message,
    operation: params.operation,
    operationIndex: params.operationIndex,
    path: params.path,
    details: params.details,
  };
}

function resolveNodes(
  value: AstNode | AstNode[] | ((target: AstNode, ctx: PatchContext) => AstNode | AstNode[]),
  target: AstNode,
  ctx: PatchContext,
): AstNode[] {
  const resolved = typeof value === 'function' ? value(target, ctx) : value;
  const asArray = Array.isArray(resolved) ? resolved : [resolved];
  return asArray.map((node) => cloneValue(node));
}

function resolveNode(
  value: AstNode | ((target: AstNode, ctx: PatchContext) => AstNode),
  target: AstNode,
  ctx: PatchContext,
): AstNode {
  const resolved = typeof value === 'function' ? value(target, ctx) : value;
  return cloneValue(resolved);
}

function findMatches(root: AstRoot, operation: PatchOperation): { matches: NodeVisit[]; selectorError?: unknown } {
  const matches: NodeVisit[] = [];
  let selectorError: unknown;

  walkAstNodes(root, (visit) => {
    if (selectorError) return;

    try {
      if (operation.match(visit.node, visit)) {
        matches.push(visit);
      }
    } catch (error) {
      selectorError = error;
    }
  });

  return { matches, selectorError };
}

function replaceNodeInParent(match: NodeVisit, replacement: AstNode): PatchError | null {
  if (!match.parent || !match.parentKey) {
    return makeError({
      code: 'INVALID_ROOT_OPERATION',
      message: 'Operation requires a parent node but target is root.',
      path: match.path,
    });
  }

  const parent = match.parent as Record<string, unknown>;
  const parentValue = parent[match.parentKey];

  if (match.parentIndex !== undefined) {
    if (!Array.isArray(parentValue)) {
      return makeError({
        code: 'INVALID_TARGET',
        message: `Parent key "${match.parentKey}" is not an array.`,
        path: match.path,
      });
    }

    const arrayContainer = parentValue as unknown[];
    arrayContainer[match.parentIndex] = replacement;
    return null;
  }

  parent[match.parentKey] = replacement;
  return null;
}

function removeNodeFromParent(match: NodeVisit): PatchError | null {
  if (!match.parent || !match.parentKey) {
    return makeError({
      code: 'INVALID_ROOT_OPERATION',
      message: 'Operation requires a parent node but target is root.',
      path: match.path,
    });
  }

  const parent = match.parent as Record<string, unknown>;
  const parentValue = parent[match.parentKey];

  if (match.parentIndex !== undefined) {
    if (!Array.isArray(parentValue)) {
      return makeError({
        code: 'INVALID_TARGET',
        message: `Parent key "${match.parentKey}" is not an array.`,
        path: match.path,
      });
    }

    const arrayContainer = parentValue as unknown[];
    arrayContainer.splice(match.parentIndex, 1);
    return null;
  }

  delete parent[match.parentKey];
  return null;
}

function applySingleOperation(
  root: AstRoot,
  operation: PatchOperation,
  operationIndex: number,
): PatchError | null {
  const { matches, selectorError } = findMatches(root, operation);

  if (selectorError) {
    return makeError({
      code: 'OPERATION_FAILED',
      message: `Selector threw an error: ${selectorError instanceof Error ? selectorError.message : String(selectorError)}`,
      operation: operation.op,
      operationIndex,
      details: selectorError,
    });
  }

  if (matches.length === 0) {
    return makeError({
      code: 'NO_MATCH',
      message: 'Selector matched zero nodes.',
      operation: operation.op,
      operationIndex,
    });
  }

  if (matches.length > 1) {
    return makeError({
      code: 'MULTIPLE_MATCHES',
      message: `Selector matched ${matches.length} nodes; expected exactly one.`,
      operation: operation.op,
      operationIndex,
    });
  }

  const match = matches[0];

  try {
    switch (operation.op) {
      case 'append': {
        const target = match.node as Record<string, unknown>;
        const children = target.children;
        if (!Array.isArray(children)) {
          return makeError({
            code: 'INVALID_TARGET',
            message: 'Append target does not have a children array.',
            operation: operation.op,
            operationIndex,
            path: match.path,
          });
        }

        const nodes = resolveNodes(operation.nodes, match.node, match);
        children.push(...nodes);
        return null;
      }

      case 'prepend': {
        const target = match.node as Record<string, unknown>;
        const children = target.children;
        if (!Array.isArray(children)) {
          return makeError({
            code: 'INVALID_TARGET',
            message: 'Prepend target does not have a children array.',
            operation: operation.op,
            operationIndex,
            path: match.path,
          });
        }

        const nodes = resolveNodes(operation.nodes, match.node, match);
        target.children = [...nodes, ...children];
        return null;
      }

      case 'replace': {
        const replacement = resolveNode(operation.replacement, match.node, match);
        if (!isAstNode(replacement)) {
          return makeError({
            code: 'INVALID_TARGET',
            message: 'Replacement must be an AST node with a string type.',
            operation: operation.op,
            operationIndex,
            path: match.path,
          });
        }

        return replaceNodeInParent(match, replacement);
      }

      case 'remove': {
        return removeNodeFromParent(match);
      }

      case 'wrap': {
        const wrapper = cloneValue(operation.createWrapper(match.node, match));
        if (!isAstNode(wrapper)) {
          return makeError({
            code: 'INVALID_TARGET',
            message: 'Wrapper factory must return an AST node with a string type.',
            operation: operation.op,
            operationIndex,
            path: match.path,
          });
        }

        const wrapperRecord = wrapper as Record<string, unknown>;
        const wrapperChildren = wrapperRecord.children;
        if (!Array.isArray(wrapperChildren)) {
          return makeError({
            code: 'INVALID_TARGET',
            message: 'Wrapper node must expose a children array to contain wrapped node.',
            operation: operation.op,
            operationIndex,
            path: match.path,
          });
        }

        wrapperChildren.push(match.node);
        return replaceNodeInParent(match, wrapper);
      }

      default:
        {
          const unreachable: never = operation;
          return makeError({
            code: 'OPERATION_FAILED',
            message: `Unknown operation kind encountered.`,
            operationIndex,
            path: match.path,
            details: unreachable,
          });
        }
    }
  } catch (error) {
    return makeError({
      code: 'OPERATION_FAILED',
      message: error instanceof Error ? error.message : String(error),
      operation: operation.op,
      operationIndex,
      path: match.path,
      details: error,
    });
  }
}

function applyPatchesInternal<T extends AstRoot>(
  root: T,
  operations: PatchOperation[],
  options: PatchApplyOptions = {},
): PatchResult<T> {
  const baseline = cloneValue(root);
  const working = cloneValue(root);
  const errors: PatchError[] = [];

  const errorMode = options.errorMode ?? 'stop-first';

  for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
    const operation = operations[operationIndex];
    const error = applySingleOperation(working, operation, operationIndex);

    if (!error) continue;

    errors.push(error);
    if (errorMode === 'stop-first') {
      break;
    }
  }

  if (errors.length === 0 && options.validate) {
    try {
      if (!options.validator) {
        errors.push(makeError({
          code: 'VALIDATION_FAILED',
          message: 'Validation requested but no validator adapter was provided.',
        }));
      } else {
        const validation = options.validator.validate(working, options.validationMode);
        if (!validation.valid) {
          for (const validationError of validation.errors) {
            errors.push(makeError({
              code: 'VALIDATION_FAILED',
              message: `${validationError.path}: ${validationError.message}`,
              path: validationError.path,
              details: validationError,
            }));
          }
        }
      }
    } catch (error) {
      errors.push(makeError({
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        details: error,
      }));
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      ast: baseline,
      errors,
      appliedCount: 0,
    };
  }

  return {
    ok: true,
    ast: working,
    errors: [],
    appliedCount: operations.length,
  };
}

export function applyDocumentPatches(
  document: Document,
  operations: PatchOperation[],
  options: PatchApplyOptions = {},
): PatchResult<Document> {
  return applyPatchesInternal(document, operations, options);
}

export function applyWorkspacePatches(
  workspace: Workspace,
  operations: PatchOperation[],
  options: PatchApplyOptions = {},
): PatchResult<Workspace> {
  return applyPatchesInternal(workspace, operations, options);
}

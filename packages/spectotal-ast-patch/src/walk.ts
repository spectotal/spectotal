import type { Document, Workspace } from '@spectotal/core';
import type { AstNode, PatchContext } from './types.js';

const PRIORITY_KEYS = new Map<string, number>([
  ['heading', 0],
  ['children', 1],
  ['documents', 2],
]);

function keySortValue(key: string): number {
  return PRIORITY_KEYS.get(key) ?? 10;
}

function sortChildKeys(a: string, b: string): number {
  const aPriority = keySortValue(a);
  const bPriority = keySortValue(b);
  if (aPriority !== bPriority) return aPriority - bPriority;
  return a.localeCompare(b);
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isAstNode(value: unknown): value is AstNode {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as { type?: unknown }).type === 'string';
}

export interface ChildNodeEntry {
  key: string;
  index?: number;
  node: AstNode;
}

export function getChildNodeEntries(node: AstNode): ChildNodeEntry[] {
  const entries: ChildNodeEntry[] = [];
  const keys = Object.keys(node)
    .filter((key) => key !== 'sourcePos')
    .sort(sortChildKeys);

  for (const key of keys) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        if (!isAstNode(item)) continue;
        entries.push({ key, index, node: item });
      }
      continue;
    }

    if (isAstNode(value)) {
      entries.push({ key, node: value });
    }
  }

  return entries;
}

function encodePointerSegment(segment: string | number): string {
  return String(segment)
    .replace(/~/g, '~0')
    .replace(/\//g, '~1');
}

export function toJsonPointer(pathSegments: Array<string | number>): string {
  if (pathSegments.length === 0) return '';
  return `/${pathSegments.map(encodePointerSegment).join('/')}`;
}

export interface NodeVisit extends PatchContext {}

export function walkAstNodes(
  root: Document | Workspace,
  visitor: (visit: NodeVisit) => void,
): void {
  const rootNode = root as unknown as AstNode;

  const walkNode = (params: {
    node: AstNode;
    parent: AstNode | null;
    parentKey?: string;
    parentIndex?: number;
    pathSegments: Array<string | number>;
    ancestors: AstNode[];
    documentId?: string;
  }): void => {
    const {
      node,
      parent,
      parentKey,
      parentIndex,
      pathSegments,
      ancestors,
      documentId,
    } = params;

    const nextDocumentId = node.type === 'document'
      ? asNonEmptyString((node as { id?: unknown }).id) ?? documentId
      : documentId;

    const visit: NodeVisit = {
      root,
      node,
      parent,
      parentKey,
      parentIndex,
      pathSegments,
      path: toJsonPointer(pathSegments),
      ancestors,
      documentId: nextDocumentId,
    };

    visitor(visit);

    const childAncestors = [...ancestors, node];
    const childEntries = getChildNodeEntries(node);

    for (const childEntry of childEntries) {
      const childPath = childEntry.index === undefined
        ? [...pathSegments, childEntry.key]
        : [...pathSegments, childEntry.key, childEntry.index];

      walkNode({
        node: childEntry.node,
        parent: node,
        parentKey: childEntry.key,
        parentIndex: childEntry.index,
        pathSegments: childPath,
        ancestors: childAncestors,
        documentId: nextDocumentId,
      });
    }
  };

  walkNode({
    node: rootNode,
    parent: null,
    pathSegments: [],
    ancestors: [],
  });
}

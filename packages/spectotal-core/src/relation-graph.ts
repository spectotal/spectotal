import type {
  RelationGraph,
  RelationGraphDiagnostic,
  SpecConfig,
  Workspace,
} from './types.js';

const RELATION_KIND = 'dependsOn' as const;

function sortedUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function asDependsOnList(config: Partial<SpecConfig> | undefined): string[] {
  const dependsOn = config?.dependsOn;
  if (!Array.isArray(dependsOn)) {
    return [];
  }

  return sortedUnique(dependsOn.filter((value): value is string => typeof value === 'string'));
}

function findCycle(
  nodeIds: string[],
  dependentsByDependency: Map<string, string[]>,
): string[] | undefined {
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];

  const visit = (nodeId: string): string[] | undefined => {
    const nodeState = state.get(nodeId) ?? 0;
    if (nodeState === 1) {
      const cycleStart = stack.indexOf(nodeId);
      if (cycleStart === -1) {
        return [nodeId, nodeId];
      }
      return [...stack.slice(cycleStart), nodeId];
    }
    if (nodeState === 2) {
      return undefined;
    }

    state.set(nodeId, 1);
    stack.push(nodeId);

    const dependents = dependentsByDependency.get(nodeId) ?? [];
    for (const dependentId of dependents) {
      const cycle = visit(dependentId);
      if (cycle) {
        return cycle;
      }
    }

    stack.pop();
    state.set(nodeId, 2);
    return undefined;
  };

  for (const nodeId of nodeIds) {
    if ((state.get(nodeId) ?? 0) !== 0) continue;
    const cycle = visit(nodeId);
    if (cycle) return cycle;
  }

  return undefined;
}

export function buildRelationGraph<
  TWorkspace extends Workspace,
  TConfig extends SpecConfig = SpecConfig,
>(params: {
  workspace: TWorkspace;
  configByDocumentId?: Record<string, Partial<TConfig>>;
}): RelationGraph {
  const diagnostics: RelationGraphDiagnostic[] = [];
  const nodes = params.workspace.documents
    .map((document) => ({
      documentId: document.id,
      sourceFile: document.sourcePos?.file,
    }))
    .sort((left, right) => {
      const idOrder = left.documentId.localeCompare(right.documentId);
      if (idOrder !== 0) return idOrder;
      return (left.sourceFile ?? '').localeCompare(right.sourceFile ?? '');
    });

  const nodeIds = nodes.map((node) => node.documentId);
  const nodeIdSet = new Set(nodeIds);

  const directDependenciesByDocument = new Map<string, Set<string>>(
    nodeIds.map((documentId) => [documentId, new Set<string>()]),
  );
  const edgeKeys = new Set<string>();

  for (const documentId of nodeIds) {
    const config = params.configByDocumentId?.[documentId] as Partial<TConfig> | undefined;
    const dependencies = asDependsOnList(config as Partial<SpecConfig> | undefined);

    for (const dependencyId of dependencies) {
      if (!nodeIdSet.has(dependencyId)) {
        diagnostics.push({
          code: 'unknown-dependency',
          message: `Document "${documentId}" depends on unknown document ID "${dependencyId}"`,
          documentId,
          dependencyId,
        });
        continue;
      }

      if (dependencyId === documentId) {
        diagnostics.push({
          code: 'self-dependency',
          message: `Document "${documentId}" cannot depend on itself`,
          documentId,
          dependencyId,
        });
        continue;
      }

      directDependenciesByDocument.get(documentId)?.add(dependencyId);
      edgeKeys.add(`${dependencyId}\u0000${documentId}`);
    }
  }

  const edges = Array.from(edgeKeys)
    .map((key) => {
      const [fromDocumentId, toDocumentId] = key.split('\u0000');
      return {
        kind: RELATION_KIND,
        fromDocumentId,
        toDocumentId,
      };
    })
    .sort((left, right) => {
      const fromOrder = left.fromDocumentId.localeCompare(right.fromDocumentId);
      if (fromOrder !== 0) return fromOrder;
      return left.toDocumentId.localeCompare(right.toDocumentId);
    });

  const indegree = new Map<string, number>(nodeIds.map((documentId) => [documentId, 0]));
  const dependentsByDependency = new Map<string, string[]>(nodeIds.map((documentId) => [documentId, []]));
  for (const edge of edges) {
    indegree.set(edge.toDocumentId, (indegree.get(edge.toDocumentId) ?? 0) + 1);
    dependentsByDependency.get(edge.fromDocumentId)?.push(edge.toDocumentId);
  }

  for (const dependents of dependentsByDependency.values()) {
    dependents.sort((left, right) => left.localeCompare(right));
  }

  const queue = sortedUnique(nodeIds.filter((documentId) => (indegree.get(documentId) ?? 0) === 0));
  const topologicalOrder: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    topologicalOrder.push(current);

    const dependents = dependentsByDependency.get(current) ?? [];
    for (const dependent of dependents) {
      const nextIndegree = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(dependent);
        queue.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  if (topologicalOrder.length !== nodeIds.length) {
    const cycle = findCycle(nodeIds, dependentsByDependency) ?? [];
    diagnostics.push({
      code: 'cycle',
      message: cycle.length > 0
        ? `Dependency cycle detected: ${cycle.join(' -> ')}`
        : 'Dependency cycle detected',
      cycle: cycle.length > 0 ? cycle : undefined,
    });
  }

  const directDependenciesByDocumentId: Record<string, string[]> = {};
  for (const documentId of nodeIds) {
    directDependenciesByDocumentId[documentId] = sortedUnique(directDependenciesByDocument.get(documentId) ?? []);
  }

  const transitiveDependenciesByDocumentId: Record<string, string[]> = {};
  const memo = new Map<string, Set<string>>();

  const collectTransitive = (documentId: string, visiting: Set<string>): Set<string> => {
    const cached = memo.get(documentId);
    if (cached) return new Set(cached);

    if (visiting.has(documentId)) {
      return new Set();
    }
    visiting.add(documentId);

    const collected = new Set<string>();
    const directDependencies = directDependenciesByDocument.get(documentId) ?? new Set<string>();
    for (const dependencyId of directDependencies) {
      collected.add(dependencyId);
      const nested = collectTransitive(dependencyId, visiting);
      for (const nestedDependencyId of nested) {
        collected.add(nestedDependencyId);
      }
    }

    visiting.delete(documentId);
    memo.set(documentId, new Set(collected));
    return collected;
  };

  for (const documentId of nodeIds) {
    transitiveDependenciesByDocumentId[documentId] = sortedUnique(
      collectTransitive(documentId, new Set<string>()),
    );
  }

  return {
    schemaVersion: '1.0.0',
    relationKind: RELATION_KIND,
    nodes,
    edges,
    topologicalOrder,
    directDependenciesByDocumentId,
    transitiveDependenciesByDocumentId,
    diagnostics,
  };
}

export function isDependencyReachable(
  relationGraph: RelationGraph | undefined,
  documentId: string,
  dependencyId: string,
): boolean {
  if (!relationGraph) return false;
  if (documentId === dependencyId) return true;
  return relationGraph.transitiveDependenciesByDocumentId[documentId]?.includes(dependencyId) ?? false;
}

export function canReferenceDocument(
  relationGraph: RelationGraph | undefined,
  sourceDocumentId: string,
  targetDocumentId: string,
): boolean {
  return isDependencyReachable(relationGraph, sourceDocumentId, targetDocumentId);
}

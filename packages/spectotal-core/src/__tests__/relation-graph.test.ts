import { describe, expect, it } from 'vitest';
import { buildRelationGraph } from '../relation-graph.js';
import type { SpecConfig, Workspace } from '../types.js';

function createWorkspace(documentIds: string[]): Workspace {
  return {
    type: 'workspace',
    documents: documentIds.map((documentId, index) => ({
      type: 'document',
      id: documentId,
      sourcePos: {
        file: `/spec/${documentId.toLowerCase()}.md`,
        line: index + 1,
        column: 1,
      },
      children: [],
    })),
  };
}

function createConfigMap(
  map: Record<string, string[]>,
): Record<string, Partial<SpecConfig>> {
  return Object.fromEntries(
    Object.entries(map).map(([id, dependsOn]) => [
      id,
      {
        id,
        specIri: `urn:spectotal:${id}`,
        dependsOn,
      },
    ]),
  );
}

describe('buildRelationGraph', () => {
  it('builds deterministic DAG edges and order for shared dependencies', () => {
    const workspace = createWorkspace(['C', 'A', 'B']);
    const relationGraph = buildRelationGraph({
      workspace,
      configByDocumentId: createConfigMap({
        A: [],
        B: ['A'],
        C: ['A', 'B'],
      }),
    });

    expect(relationGraph.edges).toEqual([
      { kind: 'dependsOn', fromDocumentId: 'A', toDocumentId: 'B' },
      { kind: 'dependsOn', fromDocumentId: 'A', toDocumentId: 'C' },
      { kind: 'dependsOn', fromDocumentId: 'B', toDocumentId: 'C' },
    ]);
    expect(relationGraph.topologicalOrder).toEqual(['A', 'B', 'C']);
    expect(relationGraph.directDependenciesByDocumentId).toEqual({
      A: [],
      B: ['A'],
      C: ['A', 'B'],
    });
    expect(relationGraph.transitiveDependenciesByDocumentId.C).toEqual(['A', 'B']);
    expect(relationGraph.diagnostics).toEqual([]);
  });

  it('emits diagnostics for unknown and self dependencies', () => {
    const workspace = createWorkspace(['A', 'B']);
    const relationGraph = buildRelationGraph({
      workspace,
      configByDocumentId: createConfigMap({
        A: ['A'],
        B: ['missing'],
      }),
    });

    expect(relationGraph.diagnostics).toEqual([
      {
        code: 'self-dependency',
        message: 'Document "A" cannot depend on itself',
        documentId: 'A',
        dependencyId: 'A',
      },
      {
        code: 'unknown-dependency',
        message: 'Document "B" depends on unknown document ID "missing"',
        documentId: 'B',
        dependencyId: 'missing',
      },
    ]);
  });

  it('detects cycles with deterministic cycle diagnostics', () => {
    const workspace = createWorkspace(['A', 'B']);
    const relationGraph = buildRelationGraph({
      workspace,
      configByDocumentId: createConfigMap({
        A: ['B'],
        B: ['A'],
      }),
    });

    expect(relationGraph.topologicalOrder).toEqual([]);
    expect(relationGraph.diagnostics).toEqual([
      {
        code: 'cycle',
        message: 'Dependency cycle detected: A -> B -> A',
        cycle: ['A', 'B', 'A'],
      },
    ]);
  });
});

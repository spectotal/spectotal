import type { CompilePlan } from "@spectotal/ast";
import type { Diagnostic } from "@spectotal/diagnostics";

export type WorkspaceId = string;
export type DocumentId = string;
export type DependencyKind = "include" | "import" | "reference" | "order";

export interface WorkspaceConfig {
  readonly profileId: string;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly featureFlags?: Readonly<Record<string, boolean>>;
}

export interface DocumentConfig {
  readonly profileId?: string;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly featureFlags?: Readonly<Record<string, boolean>>;
}

export interface WorkspaceInputDocument {
  readonly documentId: DocumentId;
  readonly uri: string;
  readonly config?: DocumentConfig;
}

export interface DocumentPlan {
  readonly documentId: DocumentId;
  readonly uri: string;
  readonly effectivePlan: CompilePlan;
}

export interface WorkspacePlan {
  readonly workspaceId: WorkspaceId;
  readonly workspaceConfig: WorkspaceConfig;
  readonly documents: readonly DocumentPlan[];
}

export interface WorkspaceNode {
  readonly documentId: DocumentId;
  readonly uri: string;
}

export interface DocumentDependencyEdge {
  readonly from: DocumentId;
  readonly to: DocumentId;
  readonly kind: DependencyKind;
}

export interface WorkspaceGraph {
  readonly workspaceId: WorkspaceId;
  readonly nodes: Readonly<Record<DocumentId, WorkspaceNode>>;
  readonly edges: readonly DocumentDependencyEdge[];
}

export interface WorkspaceDiagnostic extends Diagnostic {
  readonly documentId?: DocumentId;
  readonly relatedDocumentIds?: readonly DocumentId[];
}

export interface WorkspaceValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly WorkspaceDiagnostic[];
}

export interface WorkspaceOrderResult extends WorkspaceValidationResult {
  readonly order: readonly DocumentId[];
}

export function mergeWorkspaceAndDocumentConfig(workspaceConfig: WorkspaceConfig, document: WorkspaceInputDocument): CompilePlan {
  return {
    profileId: document.config?.profileId ?? workspaceConfig.profileId,
    options: { ...(workspaceConfig.options ?? {}), ...(document.config?.options ?? {}) },
    featureFlags: { ...(workspaceConfig.featureFlags ?? {}), ...(document.config?.featureFlags ?? {}) },
    inputs: [document.uri],
  };
}

export function buildWorkspacePlan(
  workspaceId: WorkspaceId,
  workspaceConfig: WorkspaceConfig,
  documents: readonly WorkspaceInputDocument[],
): WorkspacePlan {
  return {
    workspaceId,
    workspaceConfig,
    documents: documents.map((document) => ({
      documentId: document.documentId,
      uri: document.uri,
      effectivePlan: mergeWorkspaceAndDocumentConfig(workspaceConfig, document),
    })),
  };
}

export function validateWorkspaceGraph(graph: WorkspaceGraph): WorkspaceValidationResult {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const adjacency = new Map<DocumentId, DocumentId[]>();
  const visiting = new Set<DocumentId>();
  const visited = new Set<DocumentId>();
  const path: DocumentId[] = [];

  for (const nodeId of Object.keys(graph.nodes)) adjacency.set(nodeId, []);
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)!.push(edge.to);
  }

  function dfs(node: DocumentId): void {
    if (visiting.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = cycleStart >= 0 ? path.slice(cycleStart).concat(node) : [node];
      diagnostics.push({
        code: "workspace-cycle",
        severity: "error",
        message: `Workspace dependency cycle detected: ${cycle.join(" -> ")}`,
        documentId: node,
        relatedDocumentIds: cycle,
      });
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    path.push(node);
    for (const next of adjacency.get(node) ?? []) dfs(next);
    path.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const nodeId of Object.keys(graph.nodes)) dfs(nodeId);

  return { valid: diagnostics.length === 0, diagnostics };
}

export function topologicallyOrderWorkspace(graph: WorkspaceGraph): WorkspaceOrderResult {
  const validation = validateWorkspaceGraph(graph);
  if (!validation.valid) return { valid: false, diagnostics: validation.diagnostics, order: [] };

  const inDegree = new Map<DocumentId, number>();
  const adjacency = new Map<DocumentId, DocumentId[]>();

  for (const nodeId of Object.keys(graph.nodes)) {
    inDegree.set(nodeId, 0);
    adjacency.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order: DocumentId[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }

  return { valid: true, diagnostics: [], order };
}

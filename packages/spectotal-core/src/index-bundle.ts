import type { Document, Workspace } from '@openuji/speculator';
import type {
  IndexBundle,
  IndexBundleDocument,
  StructuralWorkspaceAst,
} from './types.js';

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function documentSort(left: IndexBundleDocument, right: IndexBundleDocument): number {
  const idOrder = left.documentId.localeCompare(right.documentId);
  if (idOrder !== 0) return idOrder;
  return (left.sourceFile ?? '').localeCompare(right.sourceFile ?? '');
}

export function createIndexBundle(workspace: Workspace, profileId: string): IndexBundle {
  const documents = workspace.documents
    .map((document) => ({
      documentId: document.id,
      sourceFile: document.sourcePos?.file,
      indexes: document.indexes ? cloneValue(document.indexes) : undefined,
      computed: document.computed ? cloneValue(document.computed) : undefined,
    }))
    .sort(documentSort);

  return {
    schemaVersion: '1.0.0',
    profileId,
    globalIndex: workspace.globalIndex ? cloneValue(workspace.globalIndex) : undefined,
    documents,
  };
}

export function stripDerivedWorkspaceAst(workspace: Workspace): StructuralWorkspaceAst {
  const clonedWorkspace = cloneValue(workspace);
  delete clonedWorkspace.globalIndex;

  for (const document of clonedWorkspace.documents) {
    delete document.indexes;
    delete document.computed;
  }

  return clonedWorkspace as StructuralWorkspaceAst;
}

export function hydrateWorkspaceFromIndexBundle(
  workspaceAst: StructuralWorkspaceAst,
  indexBundle: IndexBundle,
): Workspace {
  const hydratedWorkspace = cloneValue(workspaceAst) as Workspace;
  const indexById = new Map(indexBundle.documents.map((entry) => [entry.documentId, entry]));

  for (const document of hydratedWorkspace.documents as Document[]) {
    const indexEntry = indexById.get(document.id);
    if (!indexEntry) continue;

    if (indexEntry.indexes) {
      document.indexes = cloneValue(indexEntry.indexes);
    }
    if (indexEntry.computed) {
      document.computed = cloneValue(indexEntry.computed);
    }
  }

  if (indexBundle.globalIndex) {
    hydratedWorkspace.globalIndex = cloneValue(indexBundle.globalIndex);
  }

  return hydratedWorkspace;
}

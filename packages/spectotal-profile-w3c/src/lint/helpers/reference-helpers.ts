import type {
  Document,
  IndexDefinitionEntry,
  InlineReference,
  Workspace,
} from '@spectotal/core';
import { normalizeTerm } from '@spectotal/lint';

export const REFERENCE_TYPES = new Set([
  'workspaceDfnReference',
  'workspaceIdlReference',
  'workspaceElementReference',
  'externalDfnReference',
  'externalIdlReference',
  'externalElementReference',
  'cite',
  'sectionReference',
]);

export function buildDefinitionIndex(workspace: Workspace): Map<string, IndexDefinitionEntry[]> {
  const index = new Map<string, IndexDefinitionEntry[]>();

  for (const document of workspace.documents) {
    const definitions = document.indexes?.definitions ?? [];
    for (const entry of definitions) {
      const uniqueTerms = new Set([entry.term, ...(entry.linkTexts ?? [])]);
      for (const term of uniqueTerms) {
        const key = normalizeTerm(term);
        const entries = index.get(key) ?? [];
        if (!entries.includes(entry)) {
          entries.push(entry);
        }
        index.set(key, entries);
      }
    }
  }

  return index;
}

export function buildIdIndex(workspace: Workspace): Map<string, IndexDefinitionEntry> {
  const index = new Map<string, IndexDefinitionEntry>();

  for (const document of workspace.documents) {
    const definitions = document.indexes?.definitions ?? [];
    for (const entry of definitions) {
      if (!entry.id) continue;
      index.set(entry.id, entry);
    }
  }

  return index;
}

export function collectReferences(document: Document): InlineReference[] {
  const references: InlineReference[] = [];

  function walkNode(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const record = node as { type?: string; children?: unknown[] };

    if (record.type && REFERENCE_TYPES.has(record.type)) {
      references.push(node as InlineReference);
    }

    if (Array.isArray(record.children)) {
      for (const child of record.children) {
        walkNode(child);
      }
    }
  }

  for (const child of document.children ?? []) {
    walkNode(child);
  }

  return references;
}

export function resolveReference(
  reference: InlineReference,
  index: Map<string, IndexDefinitionEntry[]>,
): IndexDefinitionEntry[] {
  const candidateTerms = 'candidateTerms' in reference && Array.isArray(reference.candidateTerms)
    ? reference.candidateTerms
    : 'targetTerm' in reference
      ? [(reference as { targetTerm: string }).targetTerm]
      : [];

  if (candidateTerms.length === 0) return [];

  let allCandidates: IndexDefinitionEntry[] = [];

  for (const term of candidateTerms) {
    const key = normalizeTerm(term);
    const entries = index.get(key);
    if (!entries) continue;
    allCandidates.push(...entries);
  }

  const contexts = 'forContexts' in reference ? reference.forContexts : [];
  const refContexts = (contexts ?? []).filter((ctx: string | null): ctx is string => ctx !== null);
  if (refContexts.length > 0) {
    const filtered = allCandidates.filter((candidate) => (
      candidate.forContexts ?? [null]
    ).some((candidateContext) => (
      candidateContext !== null
      && refContexts.some((refContext) => normalizeTerm(candidateContext) === normalizeTerm(refContext))
    )));

    if (filtered.length > 0) {
      allCandidates = filtered;
    }
  }

  return allCandidates;
}

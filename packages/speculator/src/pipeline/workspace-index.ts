/**
 * Workspace Indexer
 * 
 * Provides utilities for finalizing the workspace AST after pipeline processing.
 */

import type { 
    Document, 
    RuntimeGlobalIndex,
    Workspace,
    GlobalIndexAST
} from './types.js';

/**
 * Finalize the workspace AST.
 */
export async function finalizeWorkspace(
    documents: Map<string, Document>,
    globalIndex: RuntimeGlobalIndex
): Promise<Workspace> {
    const definitions: NonNullable<GlobalIndexAST['definitions']> = [];
    const bibliography: NonNullable<GlobalIndexAST['bibliography']> = [];

    // 1. Convert global definitions map to array without dropping candidates.
    // Keep term bucket identity and de-duplicate within bucket deterministically.
    for (const [term, entries] of globalIndex.definitions) {
        const seenInBucket = new Set<string>();
        for (const entry of entries) {
            const source = entry.sourcePos;
            const fingerprint = [
                entry.id,
                entry.documentId ?? '',
                source?.file ?? '',
                source?.line ?? '',
                source?.column ?? '',
                source?.endLine ?? '',
                source?.endColumn ?? '',
            ].join('|');

            if (seenInBucket.has(fingerprint)) continue;
            seenInBucket.add(fingerprint);

            definitions.push({
                ...entry,
                term,
            });
        }
    }

    // 2. Convert global bibliography map to array
    for (const entry of globalIndex.bibliography.values()) {
        bibliography.push(entry);
    }

    const globalIndexAST: GlobalIndexAST = {
        definitions: definitions.sort((a, b) => {
            const termOrder = a.term.localeCompare(b.term);
            if (termOrder !== 0) return termOrder;
            const docOrder = (a.documentId ?? '').localeCompare(b.documentId ?? '');
            if (docOrder !== 0) return docOrder;
            const idOrder = a.id.localeCompare(b.id);
            if (idOrder !== 0) return idOrder;
            const fileOrder = a.sourcePos.file.localeCompare(b.sourcePos.file);
            if (fileOrder !== 0) return fileOrder;
            const lineOrder = a.sourcePos.line - b.sourcePos.line;
            if (lineOrder !== 0) return lineOrder;
            return a.sourcePos.column - b.sourcePos.column;
        }),
        bibliography: bibliography.sort((a, b) => {
            const keyOrder = a.key.localeCompare(b.key);
            if (keyOrder !== 0) return keyOrder;
            return (a.url ?? '').localeCompare(b.url ?? '');
        })
    };

    return {
        type: 'workspace',
        documents: Array.from(documents.values()),
        globalIndex: globalIndexAST
    };
}

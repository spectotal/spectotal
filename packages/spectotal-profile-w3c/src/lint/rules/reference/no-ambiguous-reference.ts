import type { IndexDefinitionEntry } from '@spectotal/core';
import type { LintContext, LintRule } from '@spectotal/lint';
import {
  buildDefinitionIndex,
  collectReferences,
  resolveReference,
} from '../../helpers/reference-helpers.js';

export const noAmbiguousReferenceRule: LintRule = {
  meta: {
    name: 'reference/no-ambiguous-reference',
    code: 'no-ambiguous-reference',
    severity: 'warning',
    description: 'References SHOULD NOT resolve to multiple definitions',
    category: 'reference',
  },

  create(context: LintContext) {
    const index = buildDefinitionIndex(context.workspace);

    return {
      onDocument(document) {
        const references = collectReferences(document);
        for (const reference of references) {
          const allCandidates = resolveReference(reference, index);
          const uniqueMap = new Map<string, IndexDefinitionEntry>();

          for (const candidate of allCandidates) {
            const contextsKey = (candidate.forContexts ?? []).sort().join(',');
            const key = `${candidate.documentId}#${candidate.term}#${contextsKey}`;
            uniqueMap.set(key, candidate);
          }

          const uniqueCandidates = Array.from(uniqueMap.values());
          if (uniqueCandidates.length <= 1) continue;

          const refContexts = ('forContexts' in reference ? reference.forContexts : []) ?? [null];
          const hasExplicitContext = refContexts.length > 0 && refContexts[0] !== null;

          let conflictCount = uniqueCandidates.length;
          if (hasExplicitContext) {
            const matches = uniqueCandidates.filter((candidate) => {
              const candidateContexts = candidate.forContexts && candidate.forContexts.length > 0
                ? candidate.forContexts
                : [null];
              return candidateContexts.some((candidateContext) => refContexts.includes(candidateContext as string));
            });
            conflictCount = matches.length;
          }

          if (conflictCount <= 1) continue;

          const locations = uniqueCandidates
            .map((candidate) => `${candidate.sourcePos?.file}:${candidate.sourcePos?.line}`)
            .slice(0, 3)
            .join(', ');
          const suffix = uniqueCandidates.length > 3 ? '...' : '';
          const targetTerm = 'targetTerm' in reference
            ? reference.targetTerm
            : ('key' in reference ? reference.key : 'unknown');

          context.report({
            message: `Ambiguous reference to "${targetTerm}" matches ${uniqueCandidates.length} definitions at: ${locations}${suffix}`,
            file: reference.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
            sourcePos: reference.sourcePos,
          });
        }
      },
    };
  },
};

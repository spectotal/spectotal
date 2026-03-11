import type { LintContext, LintRule } from '@spectotal/lint';
import { normalizeTerm } from '@spectotal/lint';
import { buildDefinitionIndex } from '../../helpers/reference-helpers.js';

export const noDuplicateDefinitionRule: LintRule = {
  meta: {
    name: 'document/no-duplicate-definition',
    code: 'no-duplicate-definition',
    severity: 'error',
    description: 'A single document MUST NOT define the same term multiple times',
    category: 'document',
  },

  create(context: LintContext) {
    const index = buildDefinitionIndex(context.workspace);

    return {
      onDocument(document) {
        const file = document.sourcePos?.file;
        const definitions = document.indexes?.definitions ?? [];

        for (const entry of definitions) {
          const allNames = new Set([entry.term, ...(entry.linkTexts ?? [])]);
          const entryContexts = entry.forContexts && entry.forContexts.length > 0
            ? entry.forContexts
            : [null];

          let reportedForEntry = false;
          for (const name of allNames) {
            if (reportedForEntry) break;

            const key = normalizeTerm(name);
            const candidates = index.get(key) ?? [];

            for (const candidate of candidates) {
              if (candidate === entry || candidate.id === entry.id) continue;
              if (candidate.sourcePos?.file !== file) continue;

              const candidateContexts = candidate.forContexts && candidate.forContexts.length > 0
                ? candidate.forContexts
                : [null];
              const hasOverlap = entryContexts.some((entryContext) => candidateContexts.includes(entryContext));

              if (!hasOverlap) continue;

              const entryLine = entry.sourcePos?.line ?? 0;
              const candidateLine = candidate.sourcePos?.line ?? 0;
              const entryCol = entry.sourcePos?.column ?? 0;
              const candidateCol = candidate.sourcePos?.column ?? 0;
              if (entryLine < candidateLine) continue;
              if (entryLine === candidateLine && entryCol <= candidateCol) continue;

              context.report({
                message: `Duplicate definition of term/alias "${name}" within the same document`,
                file: file ?? '<unknown>',
                sourcePos: entry.sourcePos,
              });
              reportedForEntry = true;
              break;
            }
          }
        }
      },
    };
  },
};

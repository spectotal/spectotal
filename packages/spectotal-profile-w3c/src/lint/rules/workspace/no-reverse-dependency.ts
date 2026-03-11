import type { LintContext, LintRule } from '@spectotal/lint';
import {
  buildDefinitionIndex,
  collectReferences,
  resolveReference,
} from '../../helpers/reference-helpers.js';

export const noReverseDependencyRule: LintRule = {
  meta: {
    name: 'workspace/no-reverse-dependency',
    code: 'no-reverse-dependency',
    severity: 'error',
    description: 'Higher-level specs MUST NOT depend on lower-level specs',
    category: 'workspace',
  },

  create(context: LintContext) {
    const index = buildDefinitionIndex(context.workspace);

    return {
      onDocument(document) {
        const sourceFile = document.sourcePos?.file;
        if (!sourceFile) return;

        const references = collectReferences(document);
        for (const reference of references) {
          const candidates = resolveReference(reference, index);
          if (candidates.length === 0) continue;

          let target = candidates[0];
          if (reference.targetId) {
            const targetId = reference.targetId;
            const targetDocId = 'targetDocumentId' in reference ? reference.targetDocumentId : undefined;
            const match = candidates.find((candidate) => (
              candidate.id === targetId && candidate.documentId === targetDocId
            ));
            if (match) target = match;
          }

          const targetFile = target.sourcePos?.file;
          if (!targetFile) continue;

          const sourceLevel = context.level;
          const targetLevel = context.documentLevels.get(targetFile) ?? 0;
          if (sourceLevel >= targetLevel) continue;

          context.report({
            message: `Higher-level spec "${sourceFile}" (level ${sourceLevel}) depends on lower-level spec "${targetFile}" (level ${targetLevel}) via term "${target.term}"`,
            file: sourceFile,
            sourcePos: reference.sourcePos,
          });
        }
      },
    };
  },
};

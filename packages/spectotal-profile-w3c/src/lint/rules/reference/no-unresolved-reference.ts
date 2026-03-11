import type { LintContext, LintRule } from '@spectotal/lint';
import { collectReferences } from '../../helpers/reference-helpers.js';

export const noUnresolvedReferenceRule: LintRule = {
  meta: {
    name: 'reference/no-unresolved-reference',
    code: 'no-unresolved-reference',
    severity: 'error',
    description: 'References must be resolved with target identifiers',
    category: 'reference',
  },

  create(context: LintContext) {
    return {
      onDocument(document) {
        const references = collectReferences(document);
        for (const reference of references) {
          switch (reference.type) {
            case 'workspaceDfnReference':
            case 'workspaceIdlReference':
            case 'workspaceElementReference':
              if (reference.targetId && reference.targetDocumentId) continue;
              context.report({
                message: `Unresolved workspace reference to "${reference.targetTerm || 'unknown'}". targetId and targetDocumentId are required.`,
                file: reference.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
                sourcePos: reference.sourcePos,
              });
              break;

            case 'externalDfnReference':
            case 'externalIdlReference':
            case 'externalElementReference':
              if (reference.targetId) continue;
              context.report({
                message: `Unresolved external reference to "${reference.targetTerm || 'unknown'}". targetId is required.`,
                file: reference.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
                sourcePos: reference.sourcePos,
              });
              break;

            case 'cite':
              if (reference.targetId) continue;
              context.report({
                message: `Unresolved citation for key "${reference.key || 'unknown'}". targetId is required.`,
                file: reference.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
                sourcePos: reference.sourcePos,
              });
              break;

            case 'sectionReference':
              if (reference.targetId) continue;
              context.report({
                message: 'Unresolved section reference. targetId is required.',
                file: reference.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
                sourcePos: reference.sourcePos,
              });
              break;
          }
        }
      },
    };
  },
};

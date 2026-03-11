import type { LintContext, LintRule } from '@spectotal/lint';

export const validDependenciesRule: LintRule = {
  meta: {
    name: 'workspace/valid-dependencies',
    code: 'valid-dependencies',
    severity: 'error',
    description: 'All document dependencies MUST exist in the workspace',
    category: 'workspace',
  },

  create(context: LintContext) {
    const availableIds = new Set(context.workspace.documents.map((document) => document.id));

    return {
      onDocument(document) {
        const deps = document.metadata?.deps;
        if (!Array.isArray(deps)) return;

        const file = document.sourcePos?.file ?? '<unknown>';
        for (const depId of deps) {
          if (availableIds.has(depId)) continue;
          context.report({
            message: `Document "${document.id}" depends on unknown document ID "${depId}"`,
            file,
            sourcePos: document.sourcePos,
          });
        }
      },
    };
  },
};

import { Parse } from '@spectotal/core';
import type { LintContext, LintRule } from '@spectotal/lint';

export const requireCopConceptRule: LintRule = {
  meta: {
    name: 'document/require-cop-concept',
    code: 'require-cop-concept',
    severity: 'error',
    description: 'Requires all normative statements to have Class of Products subject',
    category: 'document',
  },

  create(context: LintContext) {
    return {
      onDocument(document) {
        const statements = document.indexes?.statements ?? [];

        for (const statement of statements) {
          if (!Parse.isRequirement(statement.level)) continue;
          if (statement.subject) continue;

          context.report({
            message: `Normative statement (${statement.level}) is missing a Class of Products subject. Assign data-cop-concept on statement or parent scope.`,
            file: statement.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
            sourcePos: statement.sourcePos,
          });
        }
      },
    };
  },
};

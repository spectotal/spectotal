import type { LintContext, LintRule } from '@spectotal/lint';
import { normalizeTerm } from '@spectotal/lint';
import { buildDefinitionIndex } from '../../helpers/reference-helpers.js';

export const noRedefinitionRule: LintRule = {
  meta: {
    name: 'workspace/no-redefinition',
    code: 'no-redefinition',
    severity: 'error',
    description: 'Lower-level specs MUST NOT redefine concepts from higher-level specs',
    category: 'workspace',
  },

  create(context: LintContext) {
    const index = buildDefinitionIndex(context.workspace);

    return {
      onDocument(document) {
        const currentFile = document.sourcePos?.file;
        if (!currentFile) return;

        const definitions = document.indexes?.definitions ?? [];
        for (const definition of definitions) {
          const entries = index.get(normalizeTerm(definition.term)) ?? [];
          if (entries.length <= 1) continue;

          let highestEntry = entries[0];
          let highestLevel = Infinity;

          for (const existing of entries) {
            const existingFile = existing.sourcePos?.file;
            if (!existingFile) continue;
            const level = context.documentLevels.get(existingFile) ?? 0;
            if (level >= highestLevel) continue;
            highestEntry = existing;
            highestLevel = level;
          }

          const currentLevel = context.documentLevels.get(currentFile) ?? 0;
          const higherFile = highestEntry.sourcePos?.file;
          if (!higherFile || currentFile === higherFile) continue;
          if (currentLevel <= highestLevel) continue;

          context.report({
            message: `Lower-level spec "${currentFile}" redefines concept "${definition.term}" from higher-level spec "${higherFile}"`,
            file: currentFile,
            sourcePos: definition.sourcePos,
          });
        }
      },
    };
  },
};

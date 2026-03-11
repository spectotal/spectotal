import { describe, expect, it } from 'vitest';
import type { IndexBundle, StructuralWorkspaceAst } from '@spectotal/core';
import { SpectotalLinter, type LintRule } from '../index.js';

const definitionRequiredRule: LintRule = {
  meta: {
    name: 'document/definition-required',
    code: 'definition-required',
    severity: 'error',
    description: 'documents must expose at least one definition index entry',
    category: 'document',
  },
  create(context) {
    return {
      onDocument(document) {
        const definitions = document.indexes?.definitions ?? [];
        if (definitions.length > 0) return;

        context.report({
          message: 'Missing definition index entries',
          file: document.sourcePos?.file ?? '<unknown>',
          sourcePos: document.sourcePos,
        });
      },
    };
  },
};

function createWorkspaceAst(): StructuralWorkspaceAst {
  return {
    type: 'workspace',
    documents: [
      {
        type: 'document',
        id: 'doc-a',
        sourcePos: { file: '/spec/doc-a.md', line: 1, column: 1 },
        children: [],
      },
    ],
  };
}

describe('SpectotalLinter', () => {
  it('hydrates indexes from index bundle before running rules', async () => {
    const workspaceAst = createWorkspaceAst();
    const indexBundle: IndexBundle = {
      schemaVersion: '1.0.0',
      profileId: 'w3c',
      documents: [
        {
          documentId: 'doc-a',
          indexes: {
            definitions: [
              {
                term: 'Widget',
                id: 'dfn-widget',
                sourcePos: { file: '/spec/doc-a.md', line: 3, column: 1 },
              },
            ],
          },
        },
      ],
    };

    const linter = new SpectotalLinter([definitionRequiredRule]);
    const result = await linter.lint({
      workspaceAst,
      indexBundle,
      config: {
        rules: {
          'document/definition-required': 'error',
        },
      },
    });

    expect(result.hasErrors).toBe(false);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('allows severity override through config', async () => {
    const workspaceAst = createWorkspaceAst();
    const indexBundle: IndexBundle = {
      schemaVersion: '1.0.0',
      profileId: 'w3c',
      documents: [{ documentId: 'doc-a' }],
    };

    const linter = new SpectotalLinter([definitionRequiredRule]);
    const result = await linter.lint({
      workspaceAst,
      indexBundle,
      config: {
        rules: {
          'document/definition-required': 'warning',
        },
      },
    });

    expect(result.hasErrors).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.severity).toBe('warning');
  });
});

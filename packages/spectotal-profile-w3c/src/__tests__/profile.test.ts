import { describe, expect, it } from 'vitest';
import { MemoryFileProvider, runSpec } from '@spectotal/core';
import { createW3cLinter, w3cProfile, w3cRecommendedLintConfig } from '../index.js';

describe('w3cProfile', () => {
  it('runs parse + postprocess through explicit profile registration', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': '# Intro\n\n<dfn>Widget</dfn>.\n\nThe <a>Widget</a> works.',
    });

    const result = await runSpec({
      entry: '/spec/index.md',
      fileProvider: provider,
      profile: w3cProfile,
    });

    expect(result.profileId).toBe('w3c');
    expect(result.diagnostics).toEqual([]);
    expect(result.indexBundle?.documents[0]?.indexes?.definitions?.length).toBeGreaterThan(0);
  });

  it('exposes profile lint rules through lint engine', async () => {
    const linter = createW3cLinter();
    const result = await linter.lint({
      workspaceAst: {
        type: 'workspace',
        documents: [
          {
            type: 'document',
            id: 'doc-1',
            sourcePos: { file: '/spec/doc-1.md', line: 1, column: 1 },
            children: [],
          },
        ],
      },
      indexBundle: {
        schemaVersion: '1.0.0',
        profileId: 'w3c',
        documents: [
          {
            documentId: 'doc-1',
            indexes: {
              statements: [
                {
                  id: 'stmt-1',
                  level: 'MUST',
                  contentText: 'Client MUST authenticate',
                  sourcePos: { file: '/spec/doc-1.md', line: 5, column: 1 },
                },
              ],
            },
          },
        ],
      },
      config: {
        ...w3cRecommendedLintConfig,
        rules: {
          ...w3cRecommendedLintConfig.rules,
          'vocab/validate-spec-terms': 'off',
          'workspace/no-redefinition': 'off',
          'workspace/no-reverse-dependency': 'off',
          'workspace/valid-dependencies': 'off',
          'document/no-duplicate-definition': 'off',
          'reference/no-ambiguous-reference': 'off',
          'reference/no-id-reference': 'off',
          'reference/no-unresolved-reference': 'off',
        },
      },
    });

    expect(result.hasErrors).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'require-cop-concept')).toBe(true);
  });
});

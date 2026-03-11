import { describe, expect, it } from 'vitest';
import { corePlugins, type Document, type Workspace } from '#src/index';
import { postprocessDocumentAst, postprocessWorkspaceAst } from '#src/pipeline/index';

describe('postprocess*Ast APIs', () => {
  it('reprocesses document AST and clears derived fields before rerun', async () => {
    const document: Document = {
      type: 'document',
      id: 'doc-postprocess',
      sourcePos: { file: '/spec/doc-postprocess.md', line: 1, column: 1 },
      indexes: {
        statements: [
          {
            id: 'stale-entry',
            level: 'NONE',
            contentText: 'stale',
            sourcePos: { file: '/spec/doc-postprocess.md', line: 1, column: 1 },
          },
        ],
      },
      computed: { toc: [] },
      children: [
        {
          type: 'specStatement',
          level: 'MUST',
          contentText: 'The client MUST authenticate.',
          children: [{ type: 'text', value: 'The client MUST authenticate.' }],
        },
      ],
    };

    const result = await postprocessDocumentAst({
      document,
      plugins: corePlugins,
    });

    expect(result.workspace).toBeDefined();
    expect(result.errors).toBeUndefined();

    const processed = result.workspace!.documents[0];
    expect(processed.indexes?.statements).toHaveLength(1);
    expect(processed.indexes?.statements?.[0]?.id).not.toBe('stale-entry');
  });

  it('reprocesses workspace AST, supports config overrides, and reports inference failures', async () => {
    const invalidDocument: Document = {
      type: 'document',
      id: '',
      sourcePos: { file: '/spec/invalid.md', line: 1, column: 1 },
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'invalid doc' }],
        },
      ],
    };

    const validDocument: Document = {
      type: 'document',
      id: 'valid-doc',
      sourcePos: { file: '/spec/valid.md', line: 1, column: 1 },
      children: [
        {
          type: 'specStatement',
          level: 'MUST',
          dataCopConcept: 'client',
          contentText: 'The client MUST authenticate.',
          children: [{ type: 'text', value: 'The client MUST authenticate.' }],
        },
      ],
    };

    const workspace: Workspace = {
      type: 'workspace',
      documents: [invalidDocument, validDocument],
    };

    const result = await postprocessWorkspaceAst({
      workspace,
      plugins: corePlugins,
      configByDocumentId: {
        'valid-doc': {
          specIri: 'https://override.example/spec',
        },
      },
    });

    expect(result.errors?.some((error) => error.includes('Unable to infer config.id'))).toBe(true);

    const processedWorkspace = result.workspace;
    expect(processedWorkspace).toBeDefined();
    expect(processedWorkspace!.documents).toHaveLength(1);
    expect(processedWorkspace!.documents[0].id).toBe('valid-doc');

    const statement = processedWorkspace!.documents[0].indexes?.statements?.[0];
    expect(statement?.subject).toBe('https://override.example/spec#client');
  });
});

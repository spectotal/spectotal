import { describe, expect, it } from 'vitest';
import type { Document, Workspace } from '@spectotal/core';
import {
  patchAndPostprocessDocument,
  patchAndPostprocessWorkspace,
} from '../helpers/patch-and-postprocess.js';
import type { AstNode, PatchPostprocessAdapter } from '../types.js';

function createDoc(): Document {
  return {
    type: 'document',
    id: 'doc-pp',
    sourcePos: { file: '/spec/doc-pp.md', line: 1, column: 1 },
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'The client MUST authenticate.' }],
      },
    ],
  };
}

function createPostprocessAdapter(): PatchPostprocessAdapter {
  return {
    async postprocessDocument(options) {
      return {
        document: {
          ...options.document,
          indexes: {
            statements: [
              {
                id: 'stmt-1',
                level: 'MUST',
                contentText: 'The client MUST authenticate.',
                sourcePos: { file: '/spec/doc-pp.md', line: 3, column: 1 },
              },
            ],
          },
        },
      };
    },

    async postprocessWorkspace(options) {
      const firstDoc = options.workspace.documents[0];
      return {
        workspace: {
          ...options.workspace,
          documents: [
            {
              ...firstDoc,
              indexes: {
                statements: [
                  {
                    id: 'stmt-1',
                    level: 'MUST',
                    subject: 'https://example.org/spec/override#client',
                    contentText: 'The client MUST authenticate.',
                    sourcePos: { file: '/spec/doc-pp-ws.md', line: 3, column: 1 },
                  },
                ],
              },
            },
          ],
        },
      };
    },
  };
}

describe('patchAndPostprocessDocument', () => {
  it('patches a document then delegates postprocess via adapter', async () => {
    const result = await patchAndPostprocessDocument({
      document: createDoc(),
      postprocess: createPostprocessAdapter(),
      operations: [
        {
          op: 'replace',
          match: (node) => node.type === 'paragraph',
          replacement: {
            type: 'specStatement',
            level: 'MUST',
            contentText: 'The client MUST authenticate.',
            children: [{ type: 'text', value: 'The client MUST authenticate.' }],
          } as AstNode,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.ast.indexes?.statements).toHaveLength(1);
    expect(result.ast.indexes?.statements?.[0]?.level).toBe('MUST');
  });
});

describe('patchAndPostprocessWorkspace', () => {
  it('patches workspace and applies adapter postprocess result', async () => {
    const workspace: Workspace = {
      type: 'workspace',
      documents: [
        {
          type: 'document',
          id: 'doc-pp-ws',
          sourcePos: { file: '/spec/doc-pp-ws.md', line: 1, column: 1 },
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'The client MUST authenticate.' }],
            },
          ],
        },
      ],
    };

    const result = await patchAndPostprocessWorkspace({
      workspace,
      postprocess: createPostprocessAdapter(),
      configByDocumentId: {
        'doc-pp-ws': {
          specIri: 'https://example.org/spec/override',
        },
      },
      operations: [
        {
          op: 'replace',
          match: (node) => node.type === 'paragraph',
          replacement: {
            type: 'specStatement',
            level: 'MUST',
            dataCopConcept: 'client',
            contentText: 'The client MUST authenticate.',
            children: [{ type: 'text', value: 'The client MUST authenticate.' }],
          } as AstNode,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.ast.documents).toHaveLength(1);
    expect(result.ast.documents[0]?.indexes?.statements?.[0]?.subject).toBe('https://example.org/spec/override#client');
  });
});

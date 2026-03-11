import { describe, expect, it } from 'vitest';
import type { Document, Workspace } from '@spectotal/core';
import { applyDocumentPatches } from '@spectotal/ast-patch';
import {
  createWrapNormativeParagraphRecipe,
  wrapNormativeParagraphsInDocument,
  wrapNormativeParagraphsInWorkspace,
} from '../patch/normative-paragraph-recipe.js';

function createDocument(): Document {
  return {
    type: 'document',
    id: 'doc-recipe',
    sourcePos: { file: '/spec/doc-recipe.md', line: 1, column: 1 },
    children: [
      {
        type: 'paragraph',
        sourcePos: { file: '/spec/doc-recipe.md', line: 3, column: 1 },
        dataCopConcept: 'client',
        children: [{ type: 'text', value: 'The client MUST authenticate.' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'This paragraph is informative text.' }],
      },
      {
        type: 'note',
        informative: true,
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: 'Implementations SHOULD avoid side effects here.' }],
          },
        ],
      },
    ],
  };
}

describe('normative paragraph recipe', () => {
  it('wraps normative paragraphs into specStatement nodes', () => {
    const document = createDocument();
    const recipe = createWrapNormativeParagraphRecipe(document);

    expect(recipe.matches).toHaveLength(1);
    expect(recipe.matches[0]?.level).toBe('MUST');

    const result = applyDocumentPatches(document, recipe.operations);
    expect(result.ok).toBe(true);
    expect(result.ast.children[0]?.type).toBe('specStatement');
  });

  it('supports informative paragraph wrapping mode', () => {
    const result = wrapNormativeParagraphsInDocument(createDocument(), {
      includeInformative: true,
      copySourcePos: false,
    });

    expect(result.ok).toBe(true);
    const note = result.ast.children[2] as { children: Array<{ type: string }> };
    expect(note.children[0]?.type).toBe('specStatement');
  });

  it('applies at workspace level', () => {
    const workspace: Workspace = {
      type: 'workspace',
      documents: [
        createDocument(),
        {
          type: 'document',
          id: 'doc-2',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Servers MUST validate tokens.' }],
            },
          ],
        },
      ],
    };

    const result = wrapNormativeParagraphsInWorkspace(workspace);
    expect(result.ok).toBe(true);
    expect(result.ast.documents[0]?.children[0]?.type).toBe('specStatement');
    expect(result.ast.documents[1]?.children[0]?.type).toBe('specStatement');
  });
});

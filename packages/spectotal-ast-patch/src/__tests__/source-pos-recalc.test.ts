import { describe, expect, it } from 'vitest';
import type { Document, Plugin } from '@spectotal/core';
import { createSyntheticSourcePosRecalcPlugin, recalculateDocumentSourcePos } from '../plugins/synthetic-source-pos-recalc.js';
import { walkAstNodes } from '../walk.js';

function createDoc(): Document {
  return {
    type: 'document',
    id: 'doc-source',
    sourcePos: { file: '/old.md', line: 99, column: 99 },
    children: [
      {
        type: 'paragraph',
        sourcePos: { file: '/old.md', line: 100, column: 1 },
        children: [
          { type: 'text', value: 'Hello world', sourcePos: { file: '/old.md', line: 100, column: 1 } },
          { type: 'inlineCode', value: 'token' },
        ],
      },
    ],
  };
}

function collectPositions(document: Document): Array<{ path: string; file: string; line: number; column: number; endOffset?: number }> {
  const collected: Array<{ path: string; file: string; line: number; column: number; endOffset?: number }> = [];

  walkAstNodes(document, (visit) => {
    const sourcePos = visit.node.sourcePos;
    if (!sourcePos) {
      throw new Error(`Node at ${visit.path || '/'} is missing sourcePos`);
    }

    collected.push({
      path: visit.path || '/',
      file: sourcePos.file,
      line: sourcePos.line,
      column: sourcePos.column,
      endOffset: sourcePos.endOffset,
    });
  });

  return collected;
}

describe('synthetic source position recalculation', () => {
  it('overwrites sourcePos on all nodes with synthetic file coordinates', () => {
    const document = createDoc();
    recalculateDocumentSourcePos(document, 'memory://spectotal-ast/doc-source.ast');

    const positions = collectPositions(document);
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.every((entry) => entry.file === 'memory://spectotal-ast/doc-source.ast')).toBe(true);
    expect(positions.every((entry) => entry.line >= 1)).toBe(true);
    expect(positions.every((entry) => entry.column >= 1)).toBe(true);
  });

  it('is deterministic across runs for equivalent trees', () => {
    const first = createDoc();
    const second = createDoc();

    recalculateDocumentSourcePos(first, 'memory://spectotal-ast/doc-source.ast');
    recalculateDocumentSourcePos(second, 'memory://spectotal-ast/doc-source.ast');

    expect(collectPositions(first)).toEqual(collectPositions(second));
  });

  it('exposes transform plugin for pipeline usage', async () => {
    const plugin = createSyntheticSourcePosRecalcPlugin();
    const document = createDoc();
    const transformContext: Parameters<NonNullable<Plugin['transform']>>[0] = {
      document,
      level: 0,
      config: {
        id: 'doc-source',
        deps: [],
        specIri: 'https://example.org/spec/doc-source',
      },
    };

    await plugin.transform!(transformContext);

    expect(document.sourcePos?.file).toBe('memory://spectotal-ast/doc-source.ast');
    expect(document.sourcePos?.endOffset).toBeTypeOf('number');
  });
});

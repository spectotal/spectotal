import { describe, expect, it } from 'vitest';
import type { Document } from '@spectotal/core';
import { applyDocumentPatches } from '../engine.js';
import type { AstNode, PatchOperation } from '../types.js';

function createDoc(content = 'Hello'): Document {
  return {
    type: 'document',
    id: 'doc',
    sourcePos: { file: '/spec/index.md', line: 1, column: 1 },
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: content },
        ],
      },
    ],
  };
}

describe('applyDocumentPatches', () => {
  it('supports append/prepend/replace/remove/wrap operations', () => {
    const input = createDoc('middle');

    const operations: PatchOperation[] = [
      {
        op: 'prepend',
        match: (node) => node.type === 'paragraph',
        nodes: { type: 'text', value: 'start ' } as AstNode,
      },
      {
        op: 'append',
        match: (node) => node.type === 'paragraph',
        nodes: { type: 'text', value: ' end' } as AstNode,
      },
      {
        op: 'replace',
        match: (node) => node.type === 'text' && (node as { value?: string }).value === 'middle',
        replacement: { type: 'inlineCode', value: 'middle' } as AstNode,
      },
      {
        op: 'remove',
        match: (node) => node.type === 'text' && (node as { value?: string }).value === ' end',
      },
      {
        op: 'wrap',
        match: (node) => node.type === 'paragraph',
        createWrapper: () => ({ type: 'note', informative: true, children: [] } as AstNode),
      },
    ];

    const result = applyDocumentPatches(input, operations);
    expect(result.ok).toBe(true);
    expect(result.appliedCount).toBe(5);

    const wrapped = result.ast.children[0] as {
      type: string;
      children: Array<{ type: string; children: Array<{ type: string; value?: string }> }>;
    };

    expect(wrapped.type).toBe('note');
    expect(wrapped.children).toHaveLength(1);

    const paragraph = wrapped.children[0];
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph.children.map((inline) => inline.type)).toEqual(['text', 'inlineCode']);
  });

  it('enforces single-target selector cardinality', () => {
    const input: Document = {
      type: 'document',
      id: 'doc',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'A' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'B' }] },
      ],
    };

    const result = applyDocumentPatches(input, [
      {
        op: 'remove',
        match: (node) => node.type === 'paragraph',
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('MULTIPLE_MATCHES');
  });

  it('is atomic and keeps original structure unchanged when any operation fails', () => {
    const input = createDoc('value');

    const result = applyDocumentPatches(input, [
      {
        op: 'append',
        match: (node) => node.type === 'paragraph',
        nodes: { type: 'text', value: '!' } as AstNode,
      },
      {
        op: 'remove',
        match: (node) => node.type === 'blockquote',
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.appliedCount).toBe(0);
    expect(result.ast).toEqual(input);
    expect(input.children[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: 'value' }],
    });
  });

  it('collects multiple errors in collect-all mode', () => {
    const input = createDoc('x');

    const result = applyDocumentPatches(
      input,
      [
        { op: 'remove', match: (node) => node.type === 'blockquote' },
        { op: 'remove', match: (node) => node.type === 'list' },
      ],
      { errorMode: 'collect-all' },
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map((error) => error.code)).toEqual(['NO_MATCH', 'NO_MATCH']);
  });

  it('does not auto-assign sourcePos for created nodes', () => {
    const input = createDoc('value');

    const result = applyDocumentPatches(input, [
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
    ]);

    expect(result.ok).toBe(true);
    const statement = result.ast.children[0] as { sourcePos?: unknown };
    expect(statement.sourcePos).toBeUndefined();
  });

  it('preserves explicitly provided sourcePos', () => {
    const input = createDoc('value');

    const explicitSourcePos = { file: '/virtual/file', line: 10, column: 2 };
    const result = applyDocumentPatches(input, [
      {
        op: 'replace',
        match: (node) => node.type === 'paragraph',
        replacement: {
          type: 'paragraph',
          sourcePos: explicitSourcePos,
          children: [{ type: 'text', value: 'replaced' }],
        } as AstNode,
      },
    ]);

    expect(result.ok).toBe(true);
    const paragraph = result.ast.children[0] as { sourcePos?: unknown };
    expect(paragraph.sourcePos).toEqual(explicitSourcePos);
  });

  it('supports optional schema validation', () => {
    const input = createDoc('value');

    const result = applyDocumentPatches(
      input,
      [
        {
          op: 'replace',
          match: (node) => node.type === 'paragraph',
          replacement: { type: 'paragraph' } as AstNode,
        },
      ],
      {
        validate: true,
        validator: {
          validate: () => ({
            valid: false,
            errors: [{ path: '/children/0', message: 'children is required' }],
          }),
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.code === 'VALIDATION_FAILED')).toBe(true);
  });

  it('returns validation error when validate=true and no validator adapter is supplied', () => {
    const input = createDoc('value');

    const result = applyDocumentPatches(
      input,
      [
        {
          op: 'replace',
          match: (node) => node.type === 'paragraph',
          replacement: { type: 'paragraph' } as AstNode,
        },
      ],
      { validate: true },
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('VALIDATION_FAILED');
    expect(result.errors[0]?.message).toContain('no validator adapter');
  });
});

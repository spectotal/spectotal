import type { Document, Plugin, SourcePos } from '@spectotal/core';
import type { AstNode, SyntheticSourcePosRecalcOptions } from '../types.js';
import { getChildNodeEntries, toJsonPointer } from '../walk.js';

interface LineSpan {
  line: number;
  column: number;
  offset: number;
  endLine: number;
  endColumn: number;
  endOffset: number;
}

class CanonicalTextWriter {
  private readonly lines: string[] = [];
  private nextLine = 1;
  private nextOffset = 0;

  writeLine(text: string): LineSpan {
    const line = this.nextLine;
    const offset = this.nextOffset;

    this.lines.push(text);

    this.nextLine += 1;
    this.nextOffset += text.length + 1;

    return {
      line,
      column: 1,
      offset,
      endLine: line,
      endColumn: text.length + 1,
      endOffset: offset + text.length,
    };
  }

  toString(): string {
    return this.lines.join('\n');
  }
}

const PAYLOAD_FIELDS = [
  'id',
  'tempId',
  'value',
  'keyword',
  'contentText',
  'term',
  'targetTerm',
  'url',
] as const;

function toPointer(pathSegments: Array<string | number>): string {
  const pointer = toJsonPointer(pathSegments);
  return pointer.length > 0 ? pointer : '/';
}

function serializePayloadValue(value: unknown): string {
  return JSON.stringify(value);
}

function writePayloadLines(writer: CanonicalTextWriter, node: AstNode, pointer: string): void {
  for (const field of PAYLOAD_FIELDS) {
    const value = node[field];
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }

    writer.writeLine(`@payload path=${pointer} key=${field} value=${serializePayloadValue(value)}`);
  }
}

function writeNode(
  writer: CanonicalTextWriter,
  file: string,
  node: AstNode,
  pathSegments: Array<string | number>,
): void {
  const pointer = toPointer(pathSegments);
  const start = writer.writeLine(`@start path=${pointer} type=${node.type}`);

  writePayloadLines(writer, node, pointer);

  for (const childEntry of getChildNodeEntries(node)) {
    const childPath = childEntry.index === undefined
      ? [...pathSegments, childEntry.key]
      : [...pathSegments, childEntry.key, childEntry.index];

    writeNode(writer, file, childEntry.node, childPath);
  }

  const end = writer.writeLine(`@end path=${pointer} type=${node.type}`);

  const sourcePos: SourcePos = {
    file,
    line: start.line,
    column: start.column,
    offset: start.offset,
    endLine: end.endLine,
    endColumn: end.endColumn,
    endOffset: end.endOffset,
  };

  node.sourcePos = sourcePos;
}

export function recalculateDocumentSourcePos(
  document: Document,
  file: string,
): { document: Document; text: string } {
  const writer = new CanonicalTextWriter();
  writeNode(writer, file, document as unknown as AstNode, []);

  return {
    document,
    text: writer.toString(),
  };
}

export function createSyntheticSourcePosRecalcPlugin(
  options: SyntheticSourcePosRecalcOptions = {},
): Plugin {
  return {
    name: 'synthetic-source-pos-recalc',
    order: { transform: options.order ?? 22 },
    async transform(ctx): Promise<void> {
      const defaultFile = `memory://spectotal-ast/${ctx.document.id}.ast`;
      const file = options.fileForDocument?.(ctx.document, ctx.level) ?? defaultFile;
      recalculateDocumentSourcePos(ctx.document, file);
    },
  };
}

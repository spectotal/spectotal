import { fromHtml } from "hast-util-from-html";
import {
  composeSource,
  composeSourceFromUrl,
  type CompositionAdapter,
  type CompositionAdapterDiagnostic,
  type CompositionAnalysis,
  type CompositionHost,
  type CompositionPart,
  type CompositionResult,
  type LoadedSource,
} from "@spectotal/source-compose";
import {
  parseW3cMarkdownRoot,
  type MdastNode,
  type Position,
} from "../parse/markdown-frontend.js";

interface HastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly position?: Position;
}

interface HastRoot {
  readonly type: "root";
  readonly children?: readonly HastNode[];
}

interface BlockMarkerRange {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine: number;
}

interface ValidIncludeRecognition {
  readonly kind: "valid";
  readonly target: string;
  readonly line: number;
  readonly range?: BlockMarkerRange;
}

interface InvalidIncludeRecognition {
  readonly kind: "invalid";
  readonly diagnostic: CompositionAdapterDiagnostic;
  readonly range?: BlockMarkerRange;
}

type IncludeRecognition =
  | ValidIncludeRecognition
  | InvalidIncludeRecognition
  | undefined;

function buildLineStartOffsets(content: string): readonly number[] {
  const offsets = [0];

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") offsets.push(index + 1);
  }

  return offsets;
}

function lineStartOffset(
  lineStarts: readonly number[],
  line: number,
  fallback: number,
): number {
  return lineStarts[line - 1] ?? fallback;
}

function lineNumberAtOffset(
  lineStarts: readonly number[],
  offset: number,
): number {
  let lineNumber = 1;

  for (let index = 0; index < lineStarts.length; index += 1) {
    if (lineStarts[index] > offset) break;
    lineNumber = index + 1;
  }

  return lineNumber;
}

function blockMarkerRange(
  position: Position | undefined,
  lineStarts: readonly number[],
  contentLength: number,
): BlockMarkerRange | undefined {
  if (!position) return undefined;

  const startLine = position.start.line;
  const endLine = position.end.line;

  return {
    startOffset: lineStartOffset(lineStarts, startLine, 0),
    endOffset: lineStartOffset(lineStarts, endLine + 1, contentLength),
    startLine,
  };
}

interface HtmlIncludeCandidate {
  readonly element: HastNode;
  readonly consumedEndOffset: number;
}

function consumeTrailingLineBreak(value: string, offset: number): number {
  if (value[offset] === "\r" && value[offset + 1] === "\n") return offset + 2;
  if (value[offset] === "\n") return offset + 1;
  return offset;
}

function parseHtmlIncludeCandidate(
  value: string,
): HtmlIncludeCandidate | undefined {
  const root = fromHtml(value, { fragment: true }) as HastRoot;
  const meaningfulChildren = (root.children ?? []).filter((child) => {
    if (child.type !== "text") return true;
    return (child.value?.trim().length ?? 0) > 0;
  });

  const [firstChild] = meaningfulChildren;
  if (!firstChild) return undefined;
  if (firstChild.type !== "element") return undefined;

  return {
    element: firstChild,
    consumedEndOffset: consumeTrailingLineBreak(
      value,
      firstChild.position?.end.offset ?? value.length,
    ),
  };
}

function normalizeHtmlAttributeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function htmlAttributeValue(
  properties: Readonly<Record<string, unknown>> | undefined,
  attributeName: string,
): string | undefined {
  if (!properties) return undefined;

  for (const [key, value] of Object.entries(properties)) {
    if (normalizeHtmlAttributeKey(key) !== attributeName) continue;
    if (value === null || value === undefined || value === false)
      return undefined;
    if (Array.isArray(value)) return value.map(String).join(" ");
    return String(value);
  }

  return undefined;
}

function diagnostic(options: {
  code: string;
  message: string;
  line?: number;
}): CompositionAdapterDiagnostic {
  return {
    code: options.code,
    severity: "error",
    message: options.message,
    ...(options.line !== undefined ? { line: options.line } : {}),
  };
}

function recognizeDirectiveInclude(node: MdastNode): IncludeRecognition {
  if (node.type !== "leafDirective" || node.name !== "include")
    return undefined;

  const src = node.attributes?.src?.trim();
  const format = (node.attributes?.format ?? "markdown").trim().toLowerCase();
  const line = node.position?.start.line;

  if (!src) {
    return {
      kind: "invalid",
      diagnostic: diagnostic({
        code: "w3c-compose-include-missing-src",
        message: "W3C include directive requires a non-empty `src` attribute.",
        ...(line !== undefined ? { line } : {}),
      }),
    };
  }

  if (format !== "markdown") {
    return {
      kind: "invalid",
      diagnostic: diagnostic({
        code: "w3c-compose-include-unsupported-format",
        message: `W3C include directive only supports format="markdown" in composition, received ${JSON.stringify(format)}.`,
        ...(line !== undefined ? { line } : {}),
      }),
    };
  }

  return {
    kind: "valid",
    target: src,
    line: line ?? 1,
  };
}

function htmlRecognitionRange(
  node: MdastNode,
  consumedEndOffset: number,
  preserveTailContent: boolean,
  lineStarts: readonly number[],
  contentLength: number,
): BlockMarkerRange | undefined {
  const startLine = node.position?.start.line;
  const absoluteStartOffset = node.position?.start.offset;
  if (startLine === undefined || absoluteStartOffset === undefined)
    return undefined;

  if (!preserveTailContent) {
    return blockMarkerRange(node.position, lineStarts, contentLength);
  }

  return {
    startOffset: lineStartOffset(lineStarts, startLine, absoluteStartOffset),
    endOffset: Math.min(absoluteStartOffset + consumedEndOffset, contentLength),
    startLine,
  };
}

function recognizeHtmlInclude(
  node: MdastNode,
  lineStarts: readonly number[],
  contentLength: number,
): IncludeRecognition {
  if (node.type !== "html" || !node.value) return undefined;

  const candidate = parseHtmlIncludeCandidate(node.value);
  if (!candidate) return undefined;
  const { element } = candidate;
  const preserveTailContent =
    node.value.slice(candidate.consumedEndOffset).trim().length > 0;
  const range = htmlRecognitionRange(
    node,
    candidate.consumedEndOffset,
    preserveTailContent,
    lineStarts,
    contentLength,
  );

  const target = htmlAttributeValue(element.properties, "data-include")?.trim();
  if (target === undefined) return undefined;

  const format = htmlAttributeValue(
    element.properties,
    "data-include-format",
  )?.trim();
  const line = node.position?.start.line;

  if (!target) {
    return {
      kind: "invalid",
      diagnostic: diagnostic({
        code: "w3c-compose-respec-include-missing-target",
        message:
          "ReSpec-like include marker requires a non-empty `data-include` attribute.",
        ...(line !== undefined ? { line } : {}),
      }),
      ...(range ? { range } : {}),
    };
  }

  if (!format) {
    return {
      kind: "invalid",
      diagnostic: diagnostic({
        code: "w3c-compose-respec-include-format-required",
        message:
          'ReSpec-like include markers must set data-include-format="markdown" for markdown composition.',
        ...(line !== undefined ? { line } : {}),
      }),
      ...(range ? { range } : {}),
    };
  }

  if (format.toLowerCase() !== "markdown") {
    return {
      kind: "invalid",
      diagnostic: diagnostic({
        code: "w3c-compose-respec-include-unsupported-format",
        message: `ReSpec-like include markers only support data-include-format="markdown" in composition, received ${JSON.stringify(format)}.`,
        ...(line !== undefined ? { line } : {}),
      }),
      ...(range ? { range } : {}),
    };
  }

  return {
    kind: "valid",
    target,
    line: line ?? 1,
    ...(range ? { range } : {}),
  };
}

function recognizeInclude(
  node: MdastNode,
  lineStarts: readonly number[],
  contentLength: number,
): IncludeRecognition {
  return (
    recognizeDirectiveInclude(node) ??
    recognizeHtmlInclude(node, lineStarts, contentLength)
  );
}

function pushContentPart(
  parts: CompositionPart[],
  content: string,
  startLine: number,
): void {
  if (content.length === 0) return;
  parts.push({
    kind: "content",
    content,
    startLine,
  });
}

export const W3C_MARKDOWN_COMPOSITION_ADAPTER: CompositionAdapter = {
  name: "w3c-markdown-composition",
  async analyze(source): Promise<CompositionAnalysis> {
    const root = parseW3cMarkdownRoot(source.content);
    const parts: CompositionPart[] = [];
    const diagnostics: CompositionAdapterDiagnostic[] = [];
    const lineStarts = buildLineStartOffsets(source.content);
    let cursorOffset = 0;
    let cursorLine = 1;

    for (const node of root.children ?? []) {
      const include = recognizeInclude(node, lineStarts, source.content.length);
      if (!include) continue;

      const range =
        include.range ??
        blockMarkerRange(node.position, lineStarts, source.content.length);
      if (!range) continue;

      pushContentPart(
        parts,
        source.content.slice(cursorOffset, range.startOffset),
        cursorLine,
      );

      if (include.kind === "valid") {
        parts.push({
          kind: "include",
          target: include.target,
          line: include.line,
        });
      } else {
        diagnostics.push(include.diagnostic);
      }

      cursorOffset = range.endOffset;
      cursorLine = lineNumberAtOffset(lineStarts, cursorOffset);
    }

    pushContentPart(parts, source.content.slice(cursorOffset), cursorLine);

    return {
      parts,
      diagnostics,
    };
  },
};

export async function composeW3cSource(
  entry: LoadedSource,
  host?: CompositionHost,
): Promise<CompositionResult> {
  return composeSource(entry, W3C_MARKDOWN_COMPOSITION_ADAPTER, host);
}

export async function composeW3cSourceFromUrl(
  entryUrl: URL,
  host: CompositionHost,
): Promise<CompositionResult> {
  return composeSourceFromUrl(entryUrl, host, W3C_MARKDOWN_COMPOSITION_ADAPTER);
}

import {
  composeSource,
  composeSourceFromUrl,
  type CompositionAdapter,
  type CompositionHost,
  type CompositionPart,
  type CompositionResult,
  type LoadedSource,
} from "@spectotal/source-compose";

const INCLUDE_DIRECTIVE_PATTERN = /^\s*:::\s*include\s+(.+?)\s*:::\s*$/;

function splitLines(content: string): readonly string[] {
  const matches = content.match(/[^\n]*\n|[^\n]+$/g);
  return matches ?? [];
}

export const W3C_MARKDOWN_COMPOSITION_ADAPTER: CompositionAdapter = {
  name: "w3c-markdown-composition",
  async split(source) {
    const parts: CompositionPart[] = [];
    const lines = splitLines(source.content);
    const bufferedLines: string[] = [];
    let bufferStartLine: number | undefined;

    const flushContent = () => {
      if (bufferedLines.length === 0 || bufferStartLine === undefined) return;
      parts.push({
        kind: "content",
        content: bufferedLines.join(""),
        startLine: bufferStartLine,
      });
      bufferedLines.length = 0;
      bufferStartLine = undefined;
    };

    for (const [index, line] of lines.entries()) {
      const lineNumber = index + 1;
      const includeMatch = INCLUDE_DIRECTIVE_PATTERN.exec(line.trimEnd());

      if (!includeMatch) {
        if (bufferStartLine === undefined) bufferStartLine = lineNumber;
        bufferedLines.push(line);
        continue;
      }

      flushContent();
      parts.push({
        kind: "include",
        target: includeMatch[1],
        line: lineNumber,
      });
    }

    flushContent();
    return parts;
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

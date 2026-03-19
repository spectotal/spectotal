import { describe, expect, it } from "vitest";

import {
  composeSingleSource,
  composeSource,
  composeSourceFromUrl,
  type CompositionAdapter,
  type CompositionAdapterDiagnostic,
  type CompositionHost,
  type CompositionPart,
} from "../src/index.js";

const INCLUDE_PATTERN = /^\s*\[\[\s*include:(.+?)\s*\]\]\s*$/;
const INVALID_PATTERN = /^\s*\[\[\s*invalid\s*\]\]\s*$/;

function splitLines(content: string): readonly string[] {
  const matches = content.match(/[^\n]*\n|[^\n]+$/g);
  return matches ?? [];
}

const fixtureAdapter: CompositionAdapter = {
  name: "fixture-adapter",
  async analyze(source) {
    const parts: CompositionPart[] = [];
    const diagnostics: CompositionAdapterDiagnostic[] = [];
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
      const trimmedLine = line.trimEnd();
      const includeMatch = INCLUDE_PATTERN.exec(trimmedLine);
      const isInvalidMarker = INVALID_PATTERN.test(trimmedLine);

      if (!includeMatch && !isInvalidMarker) {
        if (bufferStartLine === undefined) bufferStartLine = lineNumber;
        bufferedLines.push(line);
        continue;
      }

      flushContent();
      if (isInvalidMarker) {
        diagnostics.push({
          code: "fixture-invalid-marker",
          severity: "error",
          message: "Invalid composition marker",
          line: lineNumber,
        });
        continue;
      }

      if (!includeMatch) continue;

      parts.push({
        kind: "include",
        target: includeMatch[1],
        line: lineNumber,
      });
    }

    flushContent();
    return {
      parts,
      diagnostics,
    };
  },
};

function createHost(files: Readonly<Record<string, string>>): CompositionHost {
  return {
    async resolve(target, from) {
      return new URL(target, from);
    },
    async load(url) {
      const content = files[url.href];

      if (content === undefined) {
        throw new Error(`Missing fixture for ${url.href}`);
      }

      return { url, content };
    },
  };
}

describe("@spectotal/source-compose", () => {
  it("keeps composeSingleSource as a simple synchronous convenience", () => {
    const result = composeSingleSource(
      "fixtures/w3c/single/basic.md",
      "# Title\n",
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.source).toEqual({
      entryUri: "fixtures/w3c/single/basic.md",
      fragments: [
        {
          fragmentId: "fixtures/w3c/single/basic.md:0",
          uri: "fixtures/w3c/single/basic.md",
          content: "# Title\n",
          provenanceChain: [],
        },
      ],
      includes: [],
    });
  });

  it("splices profile-supplied include parts in order with provenance ancestry", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const host = createHost({
      "https://example.test/spec/index.md":
        "Intro\n[[include:section.md]]\nOutro\n",
      "https://example.test/spec/section.md": "## Section\nBody\n",
    });

    const result = await composeSourceFromUrl(root, host, fixtureAdapter);

    expect(result.diagnostics).toEqual([]);
    expect(result.source?.entryUri).toBe(root.href);
    expect(result.source?.includes).toEqual([
      {
        sourceUri: root.href,
        targetUri: "https://example.test/spec/section.md",
        line: 2,
      },
    ]);
    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/index.md#fragment-0",
        uri: root.href,
        content: "Intro\n",
        startLine: 1,
        provenanceChain: [],
      },
      {
        fragmentId: "https://example.test/spec/section.md#fragment-1",
        uri: "https://example.test/spec/section.md",
        content: "## Section\nBody\n",
        startLine: 1,
        provenanceChain: [root.href],
      },
      {
        fragmentId: "https://example.test/spec/index.md#fragment-2",
        uri: root.href,
        content: "Outro\n",
        startLine: 3,
        provenanceChain: [],
      },
    ]);
  });

  it("produces matching composition results for browser-like and server-like hosts", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const files = {
      "https://example.test/spec/index.md":
        "Intro\n[[include:section.md]]\nOutro\n",
      "https://example.test/spec/section.md": "## Section\nBody\n",
    } satisfies Readonly<Record<string, string>>;
    const serverHost = createHost(files);
    const browserFiles = new Map<string, string>(Object.entries(files));
    const browserHost: CompositionHost = {
      async resolve(target, from) {
        return new URL(target, from);
      },
      async load(url) {
        const content = browserFiles.get(url.href);

        if (content === undefined) {
          throw new Error(`Missing browser fixture for ${url.href}`);
        }

        return {
          url: new URL(url.href),
          content,
        };
      },
    };

    const serverResult = await composeSourceFromUrl(
      root,
      serverHost,
      fixtureAdapter,
    );
    const browserResult = await composeSourceFromUrl(
      root,
      browserHost,
      fixtureAdapter,
    );

    expect(browserResult).toEqual(serverResult);
  });

  it("supports already-loaded entry content through a generic adapter", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const host = createHost({
      "https://example.test/spec/part.md": "Part\n",
    });

    const result = await composeSource(
      {
        url: root,
        content: "[[include:part.md]]\n",
      },
      fixtureAdapter,
      host,
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/part.md#fragment-0",
        uri: "https://example.test/spec/part.md",
        content: "Part\n",
        startLine: 1,
        provenanceChain: [root.href],
      },
    ]);
  });

  it("reports include cycles without recursing forever", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const host = createHost({
      "https://example.test/spec/index.md": "[[include:part.md]]\n",
      "https://example.test/spec/part.md": "[[include:index.md]]\n",
    });

    const result = await composeSourceFromUrl(root, host, fixtureAdapter);

    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/part.md#fragment-0",
        uri: "https://example.test/spec/part.md",
        content: "",
        startLine: 1,
        provenanceChain: [root.href],
      },
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "source-compose-include-cycle",
      severity: "error",
      uri: "https://example.test/spec/part.md",
      relatedUris: [
        "https://example.test/spec/index.md",
        "https://example.test/spec/part.md",
        "https://example.test/spec/index.md",
      ],
    });
  });

  it("reports when the adapter emits include parts but no host is provided", async () => {
    const result = await composeSource(
      {
        url: new URL("https://example.test/spec/index.md"),
        content: "[[include:part.md]]\n",
      },
      fixtureAdapter,
    );

    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/index.md#fragment-0",
        uri: "https://example.test/spec/index.md",
        content: "",
        startLine: 1,
        provenanceChain: [],
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "source-compose-host-required",
        severity: "error",
        message: "Include part requires a composition host: part.md",
        uri: "https://example.test/spec/index.md",
        line: 1,
      },
    ]);
  });

  it("merges adapter diagnostics into the composition result", async () => {
    const result = await composeSource(
      {
        url: new URL("https://example.test/spec/index.md"),
        content: "Intro\n[[invalid]]\nOutro\n",
      },
      fixtureAdapter,
    );

    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/index.md#fragment-0",
        uri: "https://example.test/spec/index.md",
        content: "Intro\n",
        startLine: 1,
        provenanceChain: [],
      },
      {
        fragmentId: "https://example.test/spec/index.md#fragment-1",
        uri: "https://example.test/spec/index.md",
        content: "Outro\n",
        startLine: 3,
        provenanceChain: [],
      },
    ]);
    expect(result.diagnostics).toContainEqual({
      code: "fixture-invalid-marker",
      severity: "error",
      message: "Invalid composition marker",
      uri: "https://example.test/spec/index.md",
      line: 2,
    });
  });
});

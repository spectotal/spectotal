import { describe, expect, it } from "vitest";

import {
  composeMarkdownSource,
  composeMarkdownSourceFromUrl,
  composeSingleMarkdownSource,
  type CompositionHost,
} from "../src/index.js";

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
  it("keeps composeSingleMarkdownSource as a simple synchronous convenience", () => {
    const result = composeSingleMarkdownSource(
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
          format: "markdown",
          content: "# Title\n",
          provenanceChain: [],
        },
      ],
      includeDirectives: [],
    });
  });

  it("expands markdown includes in order with provenance ancestry", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const host = createHost({
      "https://example.test/spec/index.md":
        "Intro\n::: include section.md :::\nOutro\n",
      "https://example.test/spec/section.md": "## Section\nBody\n",
    });

    const result = await composeMarkdownSourceFromUrl(root, host);

    expect(result.diagnostics).toEqual([]);
    expect(result.source?.entryUri).toBe(root.href);
    expect(result.source?.includeDirectives).toEqual([
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
        format: "markdown",
        content: "Intro\n",
        startLine: 1,
        provenanceChain: [],
      },
      {
        fragmentId: "https://example.test/spec/section.md#fragment-1",
        uri: "https://example.test/spec/section.md",
        format: "markdown",
        content: "## Section\nBody\n",
        startLine: 1,
        provenanceChain: [root.href],
      },
      {
        fragmentId: "https://example.test/spec/index.md#fragment-2",
        uri: root.href,
        format: "markdown",
        content: "Outro\n",
        startLine: 3,
        provenanceChain: [],
      },
    ]);
  });

  it("supports already-loaded entry content with the same async host contract", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const host = createHost({
      "https://example.test/spec/part.md": "Part\n",
    });

    const result = await composeMarkdownSource(
      {
        url: root,
        content: "::: include part.md :::\n",
      },
      host,
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/part.md#fragment-0",
        uri: "https://example.test/spec/part.md",
        format: "markdown",
        content: "Part\n",
        startLine: 1,
        provenanceChain: [root.href],
      },
    ]);
  });

  it("reports include cycles without recursing forever", async () => {
    const root = new URL("https://example.test/spec/index.md");
    const host = createHost({
      "https://example.test/spec/index.md": "::: include part.md :::\n",
      "https://example.test/spec/part.md": "::: include index.md :::\n",
    });

    const result = await composeMarkdownSourceFromUrl(root, host);

    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/part.md#fragment-0",
        uri: "https://example.test/spec/part.md",
        format: "markdown",
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

  it("reports when includes are present but no async host is provided", async () => {
    const result = await composeMarkdownSource({
      url: new URL("https://example.test/spec/index.md"),
      content: "::: include part.md :::\n",
    });

    expect(result.source?.fragments).toEqual([
      {
        fragmentId: "https://example.test/spec/index.md#fragment-0",
        uri: "https://example.test/spec/index.md",
        format: "markdown",
        content: "",
        startLine: 1,
        provenanceChain: [],
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "source-compose-host-required",
        severity: "error",
        message: "Include directive requires a composition host: part.md",
        uri: "https://example.test/spec/index.md",
        line: 1,
      },
    ]);
  });
});

import type { Provenance } from "@spectotal/ast";
import { describe, expect, it } from "vitest";

import {
  classifyW3cHtmlTag,
  normalizeW3cDocument,
  parseW3cMarkdownDocument,
  validateW3cNode,
  validateW3cDocument,
  w3cNodeSchemas,
  w3cSchemaSource,
} from "../src/index.js";

const provenance = (reason: string): Provenance => ({
  kind: "synthetic",
  reason,
});

function textNode(id: string, value: string) {
  return {
    kind: "text",
    id,
    value,
    provenance: provenance(`text:${id}`),
  } as const;
}

describe("@spectotal/profile-w3c", () => {
  it("keeps the authored W3C source on named content groups", () => {
    expect(w3cSchemaSource.groups?.phrasingContent?.accepts).toEqual([
      "text",
      "phrasingElement",
    ]);
    expect(w3cSchemaSource.nodes.paragraph.children?.groups).toEqual([
      "phrasingContent",
    ]);
    expect(w3cSchemaSource.nodes.flowElement.fields?.attributes).toEqual({
      type: "record",
      valueTypes: ["string", "boolean"],
      required: false,
    });
  });

  it("classifies html and custom tags into generic element kinds", () => {
    expect(classifyW3cHtmlTag("img")).toBe("voidElement");
    expect(classifyW3cHtmlTag("SPAN")).toBe("phrasingElement");
    expect(classifyW3cHtmlTag("div")).toBe("flowElement");
    expect(classifyW3cHtmlTag("x-note")).toBe("flowElement");
  });

  it("expands generated children rules for generic element kinds", () => {
    expect(w3cNodeSchemas.paragraph.children?.accepts).toEqual([
      "text",
      "phrasingElement",
    ]);
    expect(w3cNodeSchemas.flowElement.children?.accepts).toContain(
      "flowElement",
    );
    expect(w3cNodeSchemas.flowElement.children?.accepts).toContain(
      "voidElement",
    );
    expect(w3cNodeSchemas.flowElement.children?.accepts).toContain(
      "requirement",
    );
  });

  it("validates generic phrasing nodes and rejects invalid flow and void usage", () => {
    const validIssues = validateW3cNode({
      kind: "paragraph",
      id: "intro",
      provenance: provenance("intro"),
      children: [
        {
          kind: "phrasingElement",
          id: "inline-custom",
          tagName: "x-inline",
          attributes: {
            title: "inline",
            hidden: true,
          },
          provenance: provenance("inline-custom"),
          children: [textNode("inline-custom-text", "Inline custom tag")],
        },
      ],
    });

    const invalidFlowIssues = validateW3cNode({
      kind: "paragraph",
      id: "bad-paragraph",
      provenance: provenance("bad-paragraph"),
      children: [
        {
          kind: "flowElement",
          id: "bad-flow",
          tagName: "div",
          provenance: provenance("bad-flow"),
          children: [],
        },
      ],
    });

    const invalidVoidIssues = validateW3cNode({
      kind: "voidElement",
      id: "bad-void",
      tagName: "img",
      attributes: {
        width: 320,
      },
      provenance: provenance("bad-void"),
      children: [textNode("bad-void-text", "unexpected")],
    });

    expect(validIssues).toEqual([]);
    expect(invalidFlowIssues.map((issue) => issue.code)).toContain(
      "invalid_child_kind",
    );
    expect(invalidVoidIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["invalid_field_type", "unexpected_children"]),
    );
  });

  it("parses simple markdown into draft heading and paragraph nodes", async () => {
    const source = {
      entryUri: "https://example.test/spec/basic.md",
      fragments: [
        {
          fragmentId: "basic#0",
          uri: "https://example.test/spec/basic.md",
          format: "markdown" as const,
          content: "# Title\n\n## Conformance\n\nKeywords MUST.\n",
          startLine: 1,
          provenanceChain: [],
        },
      ],
      includeDirectives: [],
    };

    const result = await parseW3cMarkdownDocument({
      plan: { profileId: "w3c", inputs: [source.entryUri] },
      source,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.draft.root.children?.map((node) => node.kind)).toEqual([
      "heading",
      "heading",
      "paragraph",
    ]);
    expect(result.draft.root.children?.[0]).toMatchObject({
      kind: "heading",
      level: 1,
      provenance: {
        kind: "source",
        uri: source.entryUri,
        line: 1,
        column: 1,
        includeAncestors: [],
      },
    });
    expect(result.draft.root.children?.[2]).toMatchObject({
      kind: "paragraph",
      children: [
        {
          kind: "text",
          value: "Keywords MUST.",
        },
      ],
    });
  });

  it("maps inline html containers with markdown children into phrasing elements", async () => {
    const source = {
      entryUri: "https://example.test/spec/inline.md",
      fragments: [
        {
          fragmentId: "inline#0",
          uri: "https://example.test/spec/inline.md",
          format: "markdown" as const,
          content: "before <span>*hello*</span> after\n",
          startLine: 1,
          provenanceChain: [],
        },
      ],
      includeDirectives: [],
    };

    const result = await parseW3cMarkdownDocument({
      plan: { profileId: "w3c", inputs: [source.entryUri] },
      source,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.draft.root.children).toHaveLength(1);
    expect(result.draft.root.children?.[0]).toMatchObject({
      kind: "paragraph",
      children: [
        { kind: "text", value: "before " },
        {
          kind: "phrasingElement",
          tagName: "span",
          children: [
            {
              kind: "phrasingElement",
              tagName: "em",
              children: [{ kind: "text", value: "hello" }],
            },
          ],
        },
        { kind: "text", value: " after" },
      ],
    });
  });

  it("recovers block html islands into generic element nodes", async () => {
    const source = {
      entryUri: "https://example.test/spec/html.md",
      fragments: [
        {
          fragmentId: "html#0",
          uri: "https://example.test/spec/html.md",
          format: "markdown" as const,
          content: "<div>hi <span>x</span></div>\n",
          startLine: 1,
          provenanceChain: [],
        },
      ],
      includeDirectives: [],
    };

    const result = await parseW3cMarkdownDocument({
      plan: { profileId: "w3c", inputs: [source.entryUri] },
      source,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.draft.root.children).toMatchObject([
      {
        kind: "flowElement",
        tagName: "div",
        provenance: {
          kind: "source",
          uri: source.entryUri,
          line: 1,
          column: 1,
          includeAncestors: [],
        },
        children: [
          {
            kind: "paragraph",
            provenance: {
              kind: "source",
              uri: source.entryUri,
              line: 1,
              includeAncestors: [],
            },
            children: [
              {
                kind: "text",
                value: "hi ",
                provenance: {
                  kind: "source",
                  uri: source.entryUri,
                  line: 1,
                  column: 6,
                  includeAncestors: [],
                },
              },
              {
                kind: "phrasingElement",
                tagName: "span",
                provenance: {
                  kind: "source",
                  uri: source.entryUri,
                  line: 1,
                  column: 9,
                  includeAncestors: [],
                },
                children: [
                  {
                    kind: "text",
                    value: "x",
                    provenance: {
                      kind: "source",
                      uri: source.entryUri,
                      line: 1,
                      column: 15,
                      includeAncestors: [],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("normalizes flat heading flow into canonical sections with include ancestry preserved", async () => {
    const entryUri = "https://example.test/spec/index.md";
    const source = {
      entryUri,
      fragments: [
        {
          fragmentId: "root#0",
          uri: entryUri,
          format: "markdown" as const,
          content: "## Headline section\ntext\n\n### Details\ntext\n\n",
          startLine: 1,
          provenanceChain: [],
        },
        {
          fragmentId: "included#0",
          uri: "https://example.test/spec/conformance.md",
          format: "markdown" as const,
          content: "## Conformance\n\nKeywords MUST.\n",
          startLine: 1,
          provenanceChain: [entryUri],
        },
      ],
      includeDirectives: [
        {
          sourceUri: entryUri,
          targetUri: "https://example.test/spec/conformance.md",
          line: 7,
        },
      ],
    };

    const parsed = await parseW3cMarkdownDocument({
      plan: { profileId: "w3c", inputs: [entryUri] },
      source,
    });
    const canonical = await normalizeW3cDocument(parsed.draft, {
      plan: { profileId: "w3c", inputs: [entryUri] },
    });

    expect(parsed.diagnostics).toEqual([]);
    expect(canonical.root.children?.map((node) => node.kind)).toEqual([
      "section",
      "section",
    ]);
    expect(canonical.root.children?.[0]).toMatchObject({
      kind: "section",
      children: [
        {
          kind: "heading",
          level: 2,
        },
        {
          kind: "paragraph",
        },
        {
          kind: "section",
          children: [
            {
              kind: "heading",
              level: 3,
            },
            {
              kind: "paragraph",
            },
          ],
        },
      ],
    });
    expect(canonical.root.children?.[1]).toMatchObject({
      kind: "section",
      provenance: {
        kind: "source",
        uri: "https://example.test/spec/conformance.md",
        includeAncestors: [entryUri],
      },
      children: [
        {
          kind: "heading",
          level: 2,
          provenance: {
            kind: "source",
            uri: "https://example.test/spec/conformance.md",
            includeAncestors: [entryUri],
          },
        },
        {
          kind: "paragraph",
        },
      ],
    });
    expect(validateW3cDocument(canonical)).toEqual([]);
  });

  it("keeps headings inside generic flow containers scoped to that container subtree", async () => {
    const draft = {
      profileId: "w3c",
      root: {
        kind: "document",
        provenance: provenance("draft-root"),
        children: [
          {
            kind: "flowElement",
            tagName: "aside",
            provenance: provenance("aside"),
            children: [
              {
                kind: "heading",
                level: 2,
                provenance: provenance("aside-heading"),
                children: [textNode("aside-heading-text", "Inside aside")],
              },
              {
                kind: "paragraph",
                provenance: provenance("aside-paragraph"),
                children: [textNode("aside-paragraph-text", "Scoped content")],
              },
            ],
          },
          {
            kind: "heading",
            level: 2,
            provenance: provenance("outer-heading"),
            children: [textNode("outer-heading-text", "Outside")],
          },
        ],
      },
    };

    const canonical = await normalizeW3cDocument(draft, {
      plan: {
        profileId: "w3c",
        inputs: ["https://example.test/spec/scoped.md"],
      },
    });

    expect(canonical.root.children).toMatchObject([
      {
        kind: "flowElement",
        tagName: "aside",
        children: [
          {
            kind: "section",
            children: [
              {
                kind: "heading",
                level: 2,
              },
              {
                kind: "paragraph",
              },
            ],
          },
        ],
      },
      {
        kind: "section",
        children: [
          {
            kind: "heading",
            level: 2,
          },
        ],
      },
    ]);
    expect(validateW3cDocument(canonical)).toEqual([]);
  });
});

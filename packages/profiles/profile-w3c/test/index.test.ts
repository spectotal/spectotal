import type { Provenance } from "@spectotal/ast";
import { describe, expect, it } from "vitest";

import {
  classifyW3cHtmlTag,
  validateW3cNode,
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
});

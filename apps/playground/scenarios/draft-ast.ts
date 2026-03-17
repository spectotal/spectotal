import type { AstNode, DraftDocumentAst, Provenance } from "@spectotal/ast";

function synthetic(reason: string): Provenance {
  return { kind: "synthetic", reason };
}

function textNode(id: string, value: string): AstNode {
  return {
    kind: "text",
    id,
    provenance: synthetic(`value=${value}`),
  };
}

function paragraph(id: string, value: string): AstNode {
  return {
    kind: "paragraph",
    id,
    children: [textNode(`${id}-text`, value)],
  };
}

function heading(id: string, level: number, value: string): AstNode {
  return {
    kind: "heading",
    id,
    provenance: synthetic(`level=${level}`),
    children: [textNode(`${id}-text`, value)],
  };
}

export const draftDocumentAst: DraftDocumentAst = {
  profileId: "w3c",
  root: {
    kind: "document",
    id: "sample-draft",
    provenance: synthetic("shortName=sample-draft; status=exploration"),
    children: [
      paragraph(
        "intro-paragraph",
        "This draftDocumentAst is a playground sample for API exploration.",
      ),
      {
        kind: "section",
        id: "section-introduction",
        children: [
          heading("heading-introduction", 1, "Introduction"),
          paragraph(
            "introduction-paragraph",
            "The introduction section shows a basic paragraph child.",
          ),
          {
            kind: "note",
            id: "intro-note",
            provenance: synthetic("tone=informative"),
            children: [
              paragraph(
                "intro-note-paragraph",
                "Notes can be nested inside sections with their own paragraph content.",
              ),
            ],
          },
        ],
      },
      {
        kind: "section",
        id: "section-conformance",
        children: [
          heading("heading-conformance", 1, "Conformance"),
          paragraph(
            "conformance-paragraph",
            "This section includes requirement, example, and nested section nodes.",
          ),
          {
            kind: "requirement",
            id: "REQ-1",
            children: [
              paragraph(
                "requirement-paragraph",
                "Consumers MUST support draft AST traversal before canonical normalization.",
              ),
            ],
          },
          {
            kind: "example",
            id: "example-tree",
            children: [
              heading("example-tree-heading", 2, "Example tree"),
              paragraph(
                "example-tree-paragraph",
                "An example can hold explanatory paragraph content.",
              ),
            ],
          },
          {
            kind: "section",
            id: "section-definitions",
            children: [
              heading("heading-definitions", 2, "Definitions"),
              paragraph(
                "definitions-paragraph",
                "Nested sections are represented directly in the draft tree.",
              ),
            ],
          },
        ],
      },
      {
        kind: "issue",
        id: "ISSUE-1",
        children: [
          heading("issue-heading", 1, "Open API question"),
          paragraph(
            "issue-paragraph",
            "Should draft nodes eventually carry explicit provenance metadata?",
          ),
        ],
      },
    ],
  },
};

export default async function run(): Promise<DraftDocumentAst> {
  return draftDocumentAst;
}

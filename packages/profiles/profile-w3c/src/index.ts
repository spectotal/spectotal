import type { DraftDocumentAst } from "@spectotal/ast";
import type { ProfileSchema } from "@spectotal/ast-schema";
import type { ProfileParser, ProfileParseContext, SpectotalProfile } from "@spectotal/profile-core";

export interface MdastNode {
  readonly type: string;
  readonly value?: string;
  readonly depth?: number;
  readonly children?: readonly MdastNode[];
}

export interface W3cMarkdownParseResult {
  readonly mdast?: MdastNode;
  readonly draft: DraftDocumentAst;
  readonly diagnostics: readonly string[];
}

export const w3cSchema: ProfileSchema = {
  profileId: "w3c",
  rootKind: "document",
  nodes: {
    document: {
      kind: "document",
      children: { accepts: ["heading", "section", "paragraph", "note", "example", "issue"] }
    },
    section: {
      kind: "section",
      children: { accepts: ["heading", "section", "paragraph", "note", "example", "issue", "requirement"] }
    },
    heading: {
      kind: "heading",
      fields: {
        level: { type: "number", required: true }
      },
      children: { accepts: ["text"], minItems: 1 }
    },
    paragraph: {
      kind: "paragraph",
      children: { accepts: ["text"], minItems: 1 }
    },
    text: {
      kind: "text",
      fields: {
        value: { type: "string", required: true }
      }
    },
    requirement: {
      kind: "requirement",
      fields: {
        requirementId: { type: "string", required: true }
      },
      children: { accepts: ["paragraph", "note", "example"] }
    },
    note: {
      kind: "note",
      fields: {
        tone: { type: "string" }
      },
      children: { accepts: ["paragraph"] }
    },
    example: {
      kind: "example",
      children: { accepts: ["heading", "paragraph"] }
    },
    issue: {
      kind: "issue",
      fields: {
        issueId: { type: "string", required: true }
      },
      children: { accepts: ["heading", "paragraph"] }
    }
  }
};

export const W3C_MARKDOWN_PARSER: ProfileParser = {
  name: "w3c-markdown-parser",
  async parse(context: ProfileParseContext): Promise<DraftDocumentAst> {
    return {
      root: {
        kind: "document",
        children: [] ,
      },
      profileId: context.plan.profileId,
    };
  },
};

export async function parseW3cMarkdownDocument(context: ProfileParseContext): Promise<W3cMarkdownParseResult> {
  const draft = await W3C_MARKDOWN_PARSER.parse(context);
  return {
    mdast: { type: "root" },
    draft,
    diagnostics: [],
  };
}

export const W3C_PROFILE: SpectotalProfile = {
  id: "w3c",
  schema: w3cSchema,
  parser: W3C_MARKDOWN_PARSER,
};

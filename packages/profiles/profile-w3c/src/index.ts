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
  nodes: [
    { kind: "document", slots: [{ name: "children", accepts: ["section", "paragraph", "note", "example", "issue"] }] },
    { kind: "section", slots: [{ name: "children", accepts: ["section", "paragraph", "note", "example", "issue", "requirement"] }] },
    { kind: "paragraph" },
    { kind: "requirement" },
    { kind: "note", slots: [{ name: "children", accepts: ["paragraph"] }] },
    { kind: "example", slots: [{ name: "children", accepts: ["paragraph"] }] },
    { kind: "issue", slots: [{ name: "children", accepts: ["paragraph"] }] }
  ]
};

export const W3C_MARKDOWN_PARSER: ProfileParser = {
  name: "w3c-markdown-parser",
  async parse(context: ProfileParseContext): Promise<DraftDocumentAst> {
    return {
      root: {
        kind: "document",
        props: { entryUri: context.source.entryUri },
        slots: { children: [] },
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

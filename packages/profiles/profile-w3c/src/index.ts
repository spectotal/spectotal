import type { DraftDocumentAst } from "@spectotal/ast";
import type {
  ProfileParser,
  ProfileParseContext,
  SpectotalProfile,
} from "@spectotal/profile-core";
import { w3cSchema } from "./generated/w3c.schema.generated.js";

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

export const W3C_MARKDOWN_PARSER: ProfileParser = {
  name: "w3c-markdown-parser",
  async parse(context: ProfileParseContext): Promise<DraftDocumentAst> {
    return {
      root: {
        kind: "document",
        children: [],
      },
      profileId: context.plan.profileId,
    };
  },
};

export async function parseW3cMarkdownDocument(
  context: ProfileParseContext,
): Promise<W3cMarkdownParseResult> {
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

export {
  classifyW3cHtmlTag,
  normalizeHtmlTagName,
  type W3cHtmlNodeKind,
} from "./parse/parse-html-node.js";
export { w3cSchemaSource } from "./schema/w3c.schema-source.js";
export {
  w3cNodeSchemas,
  w3cProfileId,
  w3cRootKind,
} from "./generated/w3c.metadata.generated.js";
export { w3cPatchRulesByKind } from "./generated/w3c.rules.generated.js";
export { w3cSchema } from "./generated/w3c.schema.generated.js";
export {
  validateW3cDocument,
  validateW3cNode,
  validateW3cRoot,
  w3cValidators,
} from "./generated/w3c.validators.generated.js";
export type {
  W3cDocumentNode,
  W3cExampleNode,
  W3cFlowElementNode,
  W3cHeadingNode,
  W3cIssueNode,
  W3cNode,
  W3cNodeKind,
  W3cNoteNode,
  W3cParagraphNode,
  W3cPhrasingElementNode,
  W3cRequirementNode,
  W3cSectionNode,
  W3cTextNode,
  W3cVoidElementNode,
} from "./generated/w3c.types.generated.js";

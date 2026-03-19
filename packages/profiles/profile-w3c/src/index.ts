import type { DraftDocumentAst } from "@spectotal/ast";
import type {
  ProfileNormalizer,
  ProfileParser,
  ProfileParseContext,
  SpectotalProfile,
} from "@spectotal/profile-core";
import { w3cSchema } from "./generated/w3c.schema.generated.js";
import {
  parseW3cMarkdown,
  type W3cMarkdownParseResult,
} from "./parse/parse-document.js";
import { normalizeW3cDraftDocument } from "./normalize/normalize-draft.js";

export const W3C_MARKDOWN_PARSER: ProfileParser = {
  name: "w3c-markdown-parser",
  async parse(context: ProfileParseContext): Promise<DraftDocumentAst> {
    const result = await parseW3cMarkdown(context);
    return result.draft;
  },
};

export async function parseW3cMarkdownDocument(
  context: ProfileParseContext,
): Promise<W3cMarkdownParseResult> {
  return parseW3cMarkdown(context);
}

export const W3C_SECTION_NORMALIZER: ProfileNormalizer = {
  name: "w3c-section-normalizer",
  normalize: normalizeW3cDraftDocument,
};

export async function normalizeW3cDocument(
  draft: DraftDocumentAst,
  context: Pick<ProfileParseContext, "plan">,
) {
  return normalizeW3cDraftDocument(draft, context.plan);
}

export const W3C_PROFILE: SpectotalProfile = {
  id: "w3c",
  schema: w3cSchema,
  parser: W3C_MARKDOWN_PARSER,
  normalizers: [W3C_SECTION_NORMALIZER],
};

export {
  composeW3cSource,
  composeW3cSourceFromUrl,
  W3C_MARKDOWN_COMPOSITION_ADAPTER,
} from "./compose/compose-document.js";
export {
  classifyW3cHtmlTag,
  normalizeHtmlTagName,
  type W3cHtmlNodeKind,
} from "./parse/parse-html-node.js";
export {
  parseW3cMarkdown,
  type MdastNode,
  type W3cMarkdownParseResult,
} from "./parse/parse-document.js";
export { normalizeW3cDraftDocument } from "./normalize/normalize-draft.js";
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

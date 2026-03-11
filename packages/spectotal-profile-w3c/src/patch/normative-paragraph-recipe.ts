import { Parse, type Document, type NormativeLevel, type Workspace } from '@spectotal/core';
import {
  applyDocumentPatches,
  applyWorkspacePatches,
  type AstNode,
  type AstRoot,
  type PatchApplyOptions,
  type PatchContext,
  type PatchOperation,
  type PatchResult,
} from '@spectotal/ast-patch';
import { walkAstNodes } from '@spectotal/ast-patch';

const DEFAULT_LEVELS = new Set<NormativeLevel>([
  'MUST',
  'MUST NOT',
  'SHOULD',
  'SHOULD NOT',
  'MAY',
]);

const STATEMENT_LEVELS = new Set<NormativeLevel>([
  'MUST',
  'MUST NOT',
  'SHOULD',
  'SHOULD NOT',
  'MAY',
  'NOTE',
  'NONE',
  'AMBIGUOUS',
]);

function asNormativeLevel(value: string): NormativeLevel | undefined {
  if (STATEMENT_LEVELS.has(value as NormativeLevel)) {
    return value as NormativeLevel;
  }
  return undefined;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function toPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const record = node as Record<string, unknown>;

  let text = '';
  if (typeof record.value === 'string') {
    text += record.value;
  }
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      text += toPlainText(child);
    }
  }

  return text;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasAncestorType(ctx: PatchContext, type: string): boolean {
  return ctx.ancestors.some((ancestor) => ancestor.type === type);
}

function isParagraphNode(node: AstNode): boolean {
  return node.type === 'paragraph' && Array.isArray(node.children);
}

export interface NormativeParagraphMatch {
  path: string;
  documentId?: string;
  contentText: string;
  level: NormativeLevel;
}

export interface WrapNormativeParagraphRecipeOptions {
  levels?: NormativeLevel[];
  includeAmbiguous?: boolean;
  includeInformative?: boolean;
  copySourcePos?: boolean;
  setTempId?: boolean;
  inferLevel?: (text: string) => NormativeLevel;
  paragraphFilter?: (paragraph: AstNode, ctx: PatchContext, candidate: NormativeParagraphMatch) => boolean;
  createWrapper?: (params: {
    paragraph: AstNode;
    ctx: PatchContext;
    level: NormativeLevel;
    contentText: string;
  }) => AstNode;
}

export interface WrapNormativeParagraphRecipeResult {
  matches: NormativeParagraphMatch[];
  operations: PatchOperation[];
}

function defaultWrapper(params: {
  paragraph: AstNode;
  level: NormativeLevel;
  contentText: string;
  copySourcePos: boolean;
  setTempId: boolean;
}): AstNode {
  const wrapper: AstNode = {
    type: 'specStatement',
    level: params.level,
    contentText: params.contentText,
    children: [],
  };

  if (params.setTempId) {
    wrapper.tempId = slugify(params.contentText);
  }

  if (typeof params.paragraph.dataCopConcept === 'string') {
    wrapper.dataCopConcept = params.paragraph.dataCopConcept;
  }

  if (params.copySourcePos && params.paragraph.sourcePos) {
    wrapper.sourcePos = { ...params.paragraph.sourcePos };
  }

  return wrapper;
}

function resolveLevel(
  paragraph: AstNode,
  inferLevel: (text: string) => NormativeLevel,
  includeAmbiguous: boolean,
  allowedLevels: Set<NormativeLevel>,
): { level?: NormativeLevel; contentText: string } {
  const contentText = normalizeWhitespace(toPlainText(paragraph));
  if (!contentText) return { contentText };

  const inferred = inferLevel(contentText);
  const level = asNormativeLevel(inferred);
  if (!level) return { contentText };
  if (level === 'AMBIGUOUS' && !includeAmbiguous) return { contentText };
  if (!allowedLevels.has(level)) return { contentText };

  return { level, contentText };
}

export function createWrapNormativeParagraphRecipe(
  root: AstRoot,
  options: WrapNormativeParagraphRecipeOptions = {},
): WrapNormativeParagraphRecipeResult {
  const inferLevel = options.inferLevel ?? Parse.inferLevel;
  const includeAmbiguous = options.includeAmbiguous ?? false;
  const includeInformative = options.includeInformative ?? false;
  const copySourcePos = options.copySourcePos ?? true;
  const setTempId = options.setTempId ?? true;
  const allowedLevels = new Set(options.levels ?? Array.from(DEFAULT_LEVELS));

  const matches: NormativeParagraphMatch[] = [];
  const operations: PatchOperation[] = [];

  walkAstNodes(root, (visit) => {
    const paragraph = visit.node;
    if (!isParagraphNode(paragraph)) return;
    if (hasAncestorType(visit, 'specStatement') || hasAncestorType(visit, 'specStatementGroup')) return;
    if (!includeInformative && hasAncestorType(visit, 'note')) return;

    const resolved = resolveLevel(paragraph, inferLevel, includeAmbiguous, allowedLevels);
    if (!resolved.level || !resolved.contentText) return;

    const candidate: NormativeParagraphMatch = {
      path: visit.path,
      documentId: visit.documentId,
      contentText: resolved.contentText,
      level: resolved.level,
    };

    if (options.paragraphFilter && !options.paragraphFilter(paragraph, visit, candidate)) {
      return;
    }

    matches.push(candidate);
    operations.push({
      op: 'wrap',
      description: `Wrap normative paragraph at ${candidate.path}`,
      match: (node, ctx) => node.type === 'paragraph' && ctx.path === candidate.path,
      createWrapper: (target, ctx) => {
        const wrappedText = normalizeWhitespace(toPlainText(target));
        const wrappedLevel = asNormativeLevel(inferLevel(wrappedText)) ?? candidate.level;

        if (options.createWrapper) {
          return options.createWrapper({
            paragraph: target,
            ctx,
            level: wrappedLevel,
            contentText: wrappedText || candidate.contentText,
          });
        }

        return defaultWrapper({
          paragraph: target,
          level: wrappedLevel,
          contentText: wrappedText || candidate.contentText,
          copySourcePos,
          setTempId,
        });
      },
    });
  });

  return { matches, operations };
}

export function wrapNormativeParagraphsInDocument(
  document: Document,
  options: WrapNormativeParagraphRecipeOptions = {},
  patchOptions: PatchApplyOptions = {},
): PatchResult<Document> {
  const recipe = createWrapNormativeParagraphRecipe(document, options);
  return applyDocumentPatches(document, recipe.operations, patchOptions);
}

export function wrapNormativeParagraphsInWorkspace(
  workspace: Workspace,
  options: WrapNormativeParagraphRecipeOptions = {},
  patchOptions: PatchApplyOptions = {},
): PatchResult<Workspace> {
  const recipe = createWrapNormativeParagraphRecipe(workspace, options);
  return applyWorkspacePatches(workspace, recipe.operations, patchOptions);
}

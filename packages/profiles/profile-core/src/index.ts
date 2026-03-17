import type { CompilePlan, DraftDocumentAst, CanonicalDocumentAst } from "@spectotal/ast";
import type { NodeSelector } from "@spectotal/ast-query";
import type { ProfileSchema } from "@spectotal/ast-schema";
import type { ValidationIssue } from "@spectotal/ast-validate";
import type { ComposedSource } from "@spectotal/source-compose";

export interface ProfileParseContext {
  readonly plan: CompilePlan;
  readonly source: ComposedSource;
}

export interface ProfileParser {
  readonly name: string;
  parse(context: ProfileParseContext): Promise<DraftDocumentAst>;
}

export interface ProfileNormalizer {
  readonly name: string;
  normalize(ast: DraftDocumentAst, plan: CompilePlan): Promise<CanonicalDocumentAst>;
}

export interface ProfileValidator {
  readonly name: string;
  validate(ast: CanonicalDocumentAst, plan: CompilePlan): Promise<readonly ValidationIssue[]>;
}

export interface SelectorRegistry {
  readonly selectors: Readonly<Record<string, NodeSelector>>;
}

export interface SpectotalProfile {
  readonly id: string;
  readonly schema: ProfileSchema;
  readonly parser?: ProfileParser;
  readonly normalizers?: readonly ProfileNormalizer[];
  readonly validators?: readonly ProfileValidator[];
  readonly selectors?: SelectorRegistry;
}

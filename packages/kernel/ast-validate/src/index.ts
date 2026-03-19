import type { CanonicalDocumentAst } from "@spectotal/ast";
import {
  validateCanonicalDocumentWithSchema,
  type ProfileSchema,
} from "@spectotal/ast-schema";

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path?: readonly (string | number)[];
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export function validateCanonicalAst(
  ast: CanonicalDocumentAst,
  schema: ProfileSchema,
): ValidationResult {
  const issues = validateCanonicalDocumentWithSchema(ast, schema).map(
    (issue) => ({
      code: issue.code,
      message: issue.message,
      ...(issue.path === undefined ? {} : { path: issue.path }),
    }),
  );

  return {
    valid: issues.length === 0,
    issues,
  };
}

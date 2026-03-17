import type { CanonicalDocumentAst } from "@spectotal/ast";
import type { ProfileSchema } from "@spectotal/ast-schema";

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path?: readonly (string | number)[];
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export function validateCanonicalAst(_ast: CanonicalDocumentAst, _schema: ProfileSchema): ValidationResult {
  return { valid: true, issues: [] };
}

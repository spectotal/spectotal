import { validateAST, type ValidationMode } from '@openuji/speculator';
import type { Document, Workspace } from '@openuji/speculator';

export interface CoreValidationAdapterResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

export interface CoreValidationAdapter {
  validate(ast: Document | Workspace, mode?: ValidationMode): CoreValidationAdapterResult;
}

export function createCoreValidationAdapter(): CoreValidationAdapter {
  return {
    validate(ast, mode) {
      const result = validateAST(ast, mode ?? 'full');
      return {
        valid: result.valid,
        errors: result.errors.map((error) => ({
          path: error.path,
          message: error.message,
        })),
      };
    },
  };
}

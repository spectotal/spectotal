import type {
  Document,
  ValidationError,
  ValidationMode,
  ValidationResult,
  Workspace,
} from './types.js';

export interface CoreValidationAdapterResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface CoreValidationAdapter {
  validate(ast: Document | Workspace, mode?: ValidationMode): CoreValidationAdapterResult;
}

export type ValidationFunction = (
  ast: Document | Workspace,
  mode: ValidationMode,
) => ValidationResult;

export function createCoreValidationAdapter(validate?: ValidationFunction): CoreValidationAdapter {
  return {
    validate(ast, mode) {
      if (!validate) {
        return {
          valid: true,
          errors: [],
        };
      }

      const result = validate(ast, mode ?? 'full');
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

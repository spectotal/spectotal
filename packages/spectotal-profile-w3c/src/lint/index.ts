import { SpectotalLinter, type LintConfig, type LintRule } from '@spectotal/lint';
import { noDuplicateDefinitionRule } from './rules/document/no-duplicate-definition.js';
import { requireCopConceptRule } from './rules/document/require-cop-concept.js';
import { noAmbiguousReferenceRule } from './rules/reference/no-ambiguous-reference.js';
import { noIdReferenceRule } from './rules/reference/no-id-reference.js';
import { noUnresolvedReferenceRule } from './rules/reference/no-unresolved-reference.js';
import { validateSpecTermsRule } from './rules/vocab/validate-spec-terms.js';
import { noRedefinitionRule } from './rules/workspace/no-redefinition.js';
import { noReverseDependencyRule } from './rules/workspace/no-reverse-dependency.js';
import { validDependenciesRule } from './rules/workspace/valid-dependencies.js';

export {
  noDuplicateDefinitionRule,
  requireCopConceptRule,
  noAmbiguousReferenceRule,
  noIdReferenceRule,
  noUnresolvedReferenceRule,
  validateSpecTermsRule,
  noRedefinitionRule,
  noReverseDependencyRule,
  validDependenciesRule,
};

export const lintRules: LintRule[] = [
  noRedefinitionRule,
  noReverseDependencyRule,
  noDuplicateDefinitionRule,
  noAmbiguousReferenceRule,
  noIdReferenceRule,
  noUnresolvedReferenceRule,
  validateSpecTermsRule,
  validDependenciesRule,
  requireCopConceptRule,
];

export const recommendedLintConfig: LintConfig = {
  rules: {
    'workspace/no-redefinition': 'error',
    'workspace/no-reverse-dependency': 'error',
    'document/no-duplicate-definition': 'error',
    'reference/no-ambiguous-reference': 'warning',
    'reference/no-id-reference': 'warning',
    'reference/no-unresolved-reference': 'error',
    'vocab/validate-spec-terms': 'warning',
    'workspace/valid-dependencies': 'error',
    'document/require-cop-concept': 'error',
  },
};

export function createW3cLinter(): SpectotalLinter {
  return new SpectotalLinter(lintRules);
}

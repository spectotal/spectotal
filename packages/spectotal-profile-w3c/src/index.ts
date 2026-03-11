export { w3cProfile } from './profile.js';

export {
  lintRules as w3cLintRules,
  recommendedLintConfig as w3cRecommendedLintConfig,
  createW3cLinter,
  noDuplicateDefinitionRule,
  requireCopConceptRule,
  noAmbiguousReferenceRule,
  noIdReferenceRule,
  noUnresolvedReferenceRule,
  validateSpecTermsRule,
  noRedefinitionRule,
  noReverseDependencyRule,
  validDependenciesRule,
} from './lint/index.js';

export type { NormativeParagraphMatch, WrapNormativeParagraphRecipeOptions, WrapNormativeParagraphRecipeResult } from './patch/index.js';
export {
  createWrapNormativeParagraphRecipe,
  createW3cPostprocessAdapter,
  wrapNormativeParagraphsInDocument,
  wrapNormativeParagraphsInWorkspace,
} from './patch/index.js';

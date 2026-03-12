export { SpectotalLinter } from './linter.js';
export { runRule, inferDocumentLevels, inferDocumentLevelsFromIndexBundle } from './rule-runner.js';
export {
  defaultConfig,
  normalizeConfig,
  loadConfig,
  loadConfigFromDefaults,
  getRuleSeverity,
  isRuleEnabled,
} from './config.js';
export { normalizeTerm } from './utils.js';

export type {
  LintRule,
  LintContext,
  LintVisitor,
  LintDiagnostic,
  LintResult,
  LintOptions,
  LintConfig,
  LinterConfig,
  RuleMetadata,
  RuleResult,
  Severity,
  RuleCategory,
  RuleConfigValue,
} from './types.js';

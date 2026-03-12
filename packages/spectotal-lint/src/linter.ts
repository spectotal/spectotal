import type {
  LintConfig,
  LintDiagnostic,
  LintOptions,
  LintResult,
  LintRule,
  RuleResult,
} from './types.js';
import type { IndexBundle, StructuralWorkspaceAst } from '@spectotal/core';
import { getRuleSeverity } from './config.js';
import { runRule } from './rule-runner.js';

function inferDocumentLevelsFromWorkspaceAst(
  workspaceAst: StructuralWorkspaceAst,
  indexBundle: IndexBundle,
): Map<string, number> {
  const rankByDocumentId = new Map<string, number>(
    (indexBundle.relationGraph?.topologicalOrder ?? []).map((documentId, rank) => [documentId, rank]),
  );
  const levels = new Map<string, number>();
  workspaceAst.documents.forEach((document, index) => {
    const file = document.sourcePos?.file;
    if (!file) return;
    levels.set(file, rankByDocumentId.get(document.id) ?? index);
  });
  return levels;
}

export class SpectotalLinter {
  private readonly rules = new Map<string, LintRule>();

  constructor(rules: LintRule[]) {
    for (const rule of rules) {
      this.rules.set(rule.meta.name, rule);
    }
  }

  async lint(options: LintOptions): Promise<LintResult> {
    const startTime = performance.now();
    const config = options.config ?? { rules: {} };
    const allDiagnostics: LintDiagnostic[] = [];
    const ruleResults = new Map<string, RuleResult>();
    const documentLevels = options.documentLevels
      ?? inferDocumentLevelsFromWorkspaceAst(options.workspaceAst, options.indexBundle);

    for (const [ruleName, rule] of this.rules) {
      if (!this.isRuleEnabled(config, ruleName)) continue;

      const configuredSeverity = this.getConfiguredSeverity(config, ruleName);
      const result = await runRule(rule, {
        workspaceAst: options.workspaceAst,
        indexBundle: options.indexBundle,
        documentLevels,
      });

      if (configuredSeverity && configuredSeverity !== rule.meta.severity) {
        for (const diagnostic of result.diagnostics) {
          diagnostic.severity = configuredSeverity;
        }
      }

      ruleResults.set(ruleName, result);
      allDiagnostics.push(...result.diagnostics);
    }

    return {
      diagnostics: allDiagnostics,
      hasErrors: allDiagnostics.some((diagnostic) => diagnostic.severity === 'error'),
      ruleResults: Array.from(ruleResults.values()),
      totalTime: performance.now() - startTime,
    };
  }

  private isRuleEnabled(config: LintConfig, ruleName: string): boolean {
    return getRuleSeverity(config.rules?.[ruleName]) !== null;
  }

  private getConfiguredSeverity(
    config: LintConfig,
    ruleName: string,
  ): 'error' | 'warning' | 'info' | null {
    return getRuleSeverity(config.rules?.[ruleName]);
  }

  getRules(): LintRule[] {
    return Array.from(this.rules.values());
  }
}

import {
  hydrateWorkspaceFromIndexBundle,
  type IndexBundle,
  type StructuralWorkspaceAst,
  type Workspace,
} from '@spectotal/core';
import type {
  LintContext,
  LintDiagnostic,
  LintRule,
  RuleResult,
} from './types.js';

export function inferDocumentLevels(workspace: Workspace): Map<string, number> {
  const levels = new Map<string, number>();
  workspace.documents.forEach((document, index) => {
    const file = document.sourcePos?.file;
    if (!file) return;
    levels.set(file, index);
  });
  return levels;
}

export async function runRule(
  rule: LintRule,
  options: {
    workspaceAst: StructuralWorkspaceAst;
    indexBundle: IndexBundle;
    documentLevels?: Map<string, number>;
  },
): Promise<RuleResult> {
  const startTime = performance.now();
  const diagnostics: LintDiagnostic[] = [];
  const workspace = hydrateWorkspaceFromIndexBundle(options.workspaceAst, options.indexBundle);
  const documentLevels = options.documentLevels ?? inferDocumentLevels(workspace);

  for (const document of workspace.documents) {
    const level = documentLevels.get(document.sourcePos?.file || '') ?? 0;

    const context: LintContext = {
      workspaceAst: options.workspaceAst,
      indexBundle: options.indexBundle,
      workspace,
      documentLevels,
      document,
      level,
      report: (diagnostic) => {
        diagnostics.push({
          code: rule.meta.code,
          severity: rule.meta.severity,
          ...diagnostic,
        });
      },
    };

    const visitor = rule.create(context);
    if (visitor.onDocument) {
      await visitor.onDocument(document);
    }
  }

  return {
    ruleName: rule.meta.name,
    diagnostics,
    executionTime: performance.now() - startTime,
  };
}

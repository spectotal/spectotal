import type {
  Document,
  IndexBundle,
  SourcePos,
  StructuralWorkspaceAst,
  Workspace,
} from '@spectotal/core';

export type Severity = 'error' | 'warning' | 'info';
export type LintSeverity = Severity;

export interface LintDiagnostic {
  code: string;
  severity: Severity;
  message: string;
  file: string;
  sourcePos?: SourcePos;
}

export interface RuleResult {
  ruleName: string;
  diagnostics: LintDiagnostic[];
  executionTime: number;
  hasErrors?: boolean;
}

export interface LintResult {
  diagnostics: LintDiagnostic[];
  ruleResults: RuleResult[];
  totalTime: number;
  hasErrors: boolean;
}

export type RuleConfigValue = Severity | 'off' | {
  enabled: boolean;
  severity?: Severity;
};

export interface LinterConfig {
  extends?: string[];
  rules: Record<string, RuleConfigValue>;
}
export type LintConfig = LinterConfig;

export interface LintOptions {
  config?: LinterConfig;
  workspaceAst: StructuralWorkspaceAst;
  indexBundle: IndexBundle;
  documentLevels?: Map<string, number>;
}

export type RuleCategory = 'document' | 'reference' | 'workspace';

export interface RuleMetadata {
  name: string;
  code: string;
  severity: Severity;
  description: string;
  category: RuleCategory;
}

export interface LintContext {
  readonly workspaceAst: StructuralWorkspaceAst;
  readonly indexBundle: IndexBundle;
  readonly workspace: Workspace;
  readonly documentLevels: Map<string, number>;
  readonly document: Document;
  readonly level: number;
  report(diagnostic: Omit<LintDiagnostic, 'code' | 'severity'>): void;
}

export interface LintVisitor {
  onDocument?(doc: Document): void | Promise<void>;
}

export interface LintRule {
  meta: RuleMetadata;
  create(context: LintContext): LintVisitor;
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source?: string;
  readonly line?: number;
  readonly column?: number;
}

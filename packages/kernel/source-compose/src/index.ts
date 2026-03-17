import type { Diagnostic } from "@spectotal/diagnostics";

export type SourceFormat = "markdown" | "unknown";

export interface IncludeDirective {
  readonly sourceUri: string;
  readonly targetUri: string;
}

export interface SourceFragment {
  readonly fragmentId: string;
  readonly uri: string;
  readonly format: SourceFormat;
  readonly content: string;
  readonly startLine?: number;
  readonly provenanceChain?: readonly string[];
}

export interface ComposedSource {
  readonly entryUri: string;
  readonly fragments: readonly SourceFragment[];
  readonly includeDirectives: readonly IncludeDirective[];
}

export interface CompositionDiagnostic extends Diagnostic {
  readonly uri?: string;
  readonly relatedUris?: readonly string[];
}

export interface CompositionResult {
  readonly source?: ComposedSource;
  readonly diagnostics: readonly CompositionDiagnostic[];
}

export function composeSingleMarkdownSource(entryUri: string, content: string): CompositionResult {
  return {
    source: {
      entryUri,
      fragments: [{ fragmentId: `${entryUri}:0`, uri: entryUri, format: "markdown", content }],
      includeDirectives: [],
    },
    diagnostics: [],
  };
}

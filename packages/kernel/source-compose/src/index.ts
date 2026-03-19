import type { Diagnostic } from "@spectotal/diagnostics";

export type SourceFormat = "markdown" | "unknown";

export interface LoadedSource {
  readonly url: URL;
  readonly content: string;
}

export type SourceLoader = (url: URL) => Promise<LoadedSource>;

export type IncludeResolver = (target: string, from: URL) => Promise<URL>;

export interface CompositionHost {
  readonly resolve: IncludeResolver;
  readonly load: SourceLoader;
}

export interface IncludeDirective {
  readonly sourceUri: string;
  readonly targetUri: string;
  readonly line?: number;
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

const INCLUDE_DIRECTIVE_PATTERN = /^\s*:::\s*include\s+(.+?)\s*:::\s*$/;

interface CompositionState {
  readonly diagnostics: CompositionDiagnostic[];
  readonly includeDirectives: IncludeDirective[];
  nextFragmentId: number;
}

function detectSourceFormat(url: URL): SourceFormat {
  const pathname = url.pathname.toLowerCase();
  if (pathname.endsWith(".md") || pathname.endsWith(".markdown")) {
    return "markdown";
  }

  return "unknown";
}

function splitLines(content: string): readonly string[] {
  const matches = content.match(/[^\n]*\n|[^\n]+$/g);
  return matches ?? [];
}

function createFragment(options: {
  state: CompositionState;
  source: LoadedSource;
  startLine: number;
  content: string;
  provenanceChain: readonly string[];
}): SourceFragment {
  const fragmentId = `${options.source.url.href}#fragment-${options.state.nextFragmentId}`;
  options.state.nextFragmentId += 1;

  return {
    fragmentId,
    uri: options.source.url.href,
    format: detectSourceFormat(options.source.url),
    content: options.content,
    startLine: options.startLine,
    provenanceChain: options.provenanceChain,
  };
}

function flushBufferedLines(options: {
  state: CompositionState;
  source: LoadedSource;
  lines: string[];
  startLine: number | undefined;
  provenanceChain: readonly string[];
  fragments: SourceFragment[];
}): void {
  if (options.lines.length === 0 || options.startLine === undefined) return;

  options.fragments.push(
    createFragment({
      state: options.state,
      source: options.source,
      startLine: options.startLine,
      content: options.lines.join(""),
      provenanceChain: options.provenanceChain,
    }),
  );
  options.lines.length = 0;
}

function createCycleDiagnostic(options: {
  source: LoadedSource;
  target: URL;
  stack: readonly URL[];
}): CompositionDiagnostic {
  const cycleStart = options.stack.findIndex(
    (candidate) => candidate.href === options.target.href,
  );
  const cycle =
    cycleStart >= 0
      ? options.stack.slice(cycleStart).concat(options.target)
      : [...options.stack, options.target];
  const cycleUris = cycle.map((url) => url.href);

  return {
    code: "source-compose-include-cycle",
    severity: "error",
    message: `Include cycle detected: ${cycleUris.join(" -> ")}`,
    uri: options.source.url.href,
    relatedUris: cycleUris,
  };
}

async function composeFragments(options: {
  source: LoadedSource;
  host: CompositionHost | undefined;
  state: CompositionState;
  stack: readonly URL[];
  ancestry: readonly string[];
}): Promise<readonly SourceFragment[]> {
  const lines = splitLines(options.source.content);
  const fragments: SourceFragment[] = [];
  const bufferedLines: string[] = [];
  let bufferStartLine: number | undefined;

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const includeMatch = INCLUDE_DIRECTIVE_PATTERN.exec(line.trimEnd());

    if (!includeMatch) {
      if (bufferStartLine === undefined) bufferStartLine = lineNumber;
      bufferedLines.push(line);
      continue;
    }

    flushBufferedLines({
      state: options.state,
      source: options.source,
      lines: bufferedLines,
      startLine: bufferStartLine,
      provenanceChain: options.ancestry,
      fragments,
    });
    bufferStartLine = undefined;

    if (!options.host) {
      options.state.diagnostics.push({
        code: "source-compose-host-required",
        severity: "error",
        message: `Include directive requires a composition host: ${includeMatch[1]}`,
        uri: options.source.url.href,
        line: lineNumber,
      });
      continue;
    }

    const resolvedUrl = await options.host.resolve(
      includeMatch[1],
      options.source.url,
    );
    options.state.includeDirectives.push({
      sourceUri: options.source.url.href,
      targetUri: resolvedUrl.href,
      line: lineNumber,
    });

    if (
      options.stack.some((candidate) => candidate.href === resolvedUrl.href)
    ) {
      options.state.diagnostics.push(
        createCycleDiagnostic({
          source: options.source,
          target: resolvedUrl,
          stack: options.stack,
        }),
      );
      continue;
    }

    const loadedSource = await options.host.load(resolvedUrl);

    if (
      options.stack.some(
        (candidate) => candidate.href === loadedSource.url.href,
      )
    ) {
      options.state.diagnostics.push(
        createCycleDiagnostic({
          source: options.source,
          target: loadedSource.url,
          stack: options.stack,
        }),
      );
      continue;
    }

    const includedFragments = await composeFragments({
      source: loadedSource,
      host: options.host,
      state: options.state,
      stack: [...options.stack, loadedSource.url],
      ancestry: [...options.ancestry, options.source.url.href],
    });
    fragments.push(...includedFragments);
  }

  flushBufferedLines({
    state: options.state,
    source: options.source,
    lines: bufferedLines,
    startLine: bufferStartLine,
    provenanceChain: options.ancestry,
    fragments,
  });

  if (fragments.length === 0) {
    fragments.push(
      createFragment({
        state: options.state,
        source: options.source,
        startLine: 1,
        content: "",
        provenanceChain: options.ancestry,
      }),
    );
  }

  return fragments;
}

export async function composeMarkdownSource(
  entry: LoadedSource,
  host?: CompositionHost,
): Promise<CompositionResult> {
  const state: CompositionState = {
    diagnostics: [],
    includeDirectives: [],
    nextFragmentId: 0,
  };
  const fragments = await composeFragments({
    source: entry,
    host,
    state,
    stack: [entry.url],
    ancestry: [],
  });

  return {
    source: {
      entryUri: entry.url.href,
      fragments,
      includeDirectives: state.includeDirectives,
    },
    diagnostics: state.diagnostics,
  };
}

export async function composeMarkdownSourceFromUrl(
  entryUrl: URL,
  host: CompositionHost,
): Promise<CompositionResult> {
  const entry = await host.load(entryUrl);
  return composeMarkdownSource(entry, host);
}

export function composeSingleMarkdownSource(
  entryUri: string,
  content: string,
): CompositionResult {
  return {
    source: {
      entryUri,
      fragments: [
        {
          fragmentId: `${entryUri}:0`,
          uri: entryUri,
          format: "markdown",
          content,
          provenanceChain: [],
        },
      ],
      includeDirectives: [],
    },
    diagnostics: [],
  };
}

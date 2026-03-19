import type { Diagnostic } from "@spectotal/diagnostics";

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

export interface CompositionPartContent {
  readonly kind: "content";
  readonly content: string;
  readonly startLine: number;
}

export interface CompositionPartInclude {
  readonly kind: "include";
  readonly target: string;
  readonly line: number;
}

export type CompositionPart = CompositionPartContent | CompositionPartInclude;

export interface CompositionAdapter {
  readonly name: string;
  split(source: LoadedSource): Promise<readonly CompositionPart[]>;
}

export interface ComposedInclude {
  readonly sourceUri: string;
  readonly targetUri: string;
  readonly line?: number;
}

export interface SourceFragment {
  readonly fragmentId: string;
  readonly uri: string;
  readonly content: string;
  readonly startLine?: number;
  readonly provenanceChain?: readonly string[];
}

export interface ComposedSource {
  readonly entryUri: string;
  readonly fragments: readonly SourceFragment[];
  readonly includes: readonly ComposedInclude[];
}

export interface CompositionDiagnostic extends Diagnostic {
  readonly uri?: string;
  readonly relatedUris?: readonly string[];
}

export interface CompositionResult {
  readonly source?: ComposedSource;
  readonly diagnostics: readonly CompositionDiagnostic[];
}

interface CompositionState {
  readonly diagnostics: CompositionDiagnostic[];
  readonly includes: ComposedInclude[];
  nextFragmentId: number;
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
    content: options.content,
    startLine: options.startLine,
    provenanceChain: options.provenanceChain,
  };
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
  adapter: CompositionAdapter;
  state: CompositionState;
  stack: readonly URL[];
  ancestry: readonly string[];
}): Promise<readonly SourceFragment[]> {
  const parts = await options.adapter.split(options.source);
  const fragments: SourceFragment[] = [];

  for (const part of parts) {
    if (part.kind === "content") {
      if (part.content.length === 0) continue;
      fragments.push(
        createFragment({
          state: options.state,
          source: options.source,
          startLine: part.startLine,
          content: part.content,
          provenanceChain: options.ancestry,
        }),
      );
      continue;
    }

    if (!options.host) {
      options.state.diagnostics.push({
        code: "source-compose-host-required",
        severity: "error",
        message: `Include part requires a composition host: ${part.target}`,
        uri: options.source.url.href,
        line: part.line,
      });
      continue;
    }

    const resolvedUrl = await options.host.resolve(
      part.target,
      options.source.url,
    );
    options.state.includes.push({
      sourceUri: options.source.url.href,
      targetUri: resolvedUrl.href,
      line: part.line,
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
      adapter: options.adapter,
      state: options.state,
      stack: [...options.stack, loadedSource.url],
      ancestry: [...options.ancestry, options.source.url.href],
    });
    fragments.push(...includedFragments);
  }

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

export async function composeSource(
  entry: LoadedSource,
  adapter: CompositionAdapter,
  host?: CompositionHost,
): Promise<CompositionResult> {
  const state: CompositionState = {
    diagnostics: [],
    includes: [],
    nextFragmentId: 0,
  };
  const fragments = await composeFragments({
    source: entry,
    host,
    adapter,
    state,
    stack: [entry.url],
    ancestry: [],
  });

  return {
    source: {
      entryUri: entry.url.href,
      fragments,
      includes: state.includes,
    },
    diagnostics: state.diagnostics,
  };
}

export async function composeSourceFromUrl(
  entryUrl: URL,
  host: CompositionHost,
  adapter: CompositionAdapter,
): Promise<CompositionResult> {
  const entry = await host.load(entryUrl);
  return composeSource(entry, adapter, host);
}

export function composeSingleSource(
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
          content,
          provenanceChain: [],
        },
      ],
      includes: [],
    },
    diagnostics: [],
  };
}

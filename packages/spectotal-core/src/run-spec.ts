import {
  NodeFileProvider,
  Parse,
  Preprocess,
  postprocessDocumentAst,
  postprocessWorkspaceAst,
  type Document,
  type Workspace,
} from '@openuji/speculator';
import { createIndexBundle, stripDerivedWorkspaceAst } from './index-bundle.js';
import { ProfileParserRegistry } from './parser-registry.js';
import type {
  PostprocessDocumentWithProfileOptions,
  PostprocessWorkspaceWithProfileOptions,
  RunSpecOptions,
  SpectotalProfile,
  SpectotalRunResult,
} from './types.js';

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildParseRegistry(profile: SpectotalProfile): InstanceType<typeof Parse.ParseHandlerRegistry> {
  const profileRegistry = new ProfileParserRegistry();
  profile.registerParsers?.(profileRegistry);

  const parseRegistry = new Parse.ParseHandlerRegistry();
  for (const parser of profileRegistry.htmlParsers) {
    parseRegistry.registerHtmlParser(parser as never);
  }
  for (const parser of profileRegistry.markdownParsers) {
    parseRegistry.registerMarkdownParser(parser as never);
  }

  return parseRegistry;
}

function singleDocumentWorkspace(document: Document): Workspace {
  return {
    type: 'workspace',
    documents: [document],
  };
}

async function finalizeResult(
  workspace: Workspace | undefined,
  profileId: string,
  diagnostics: string[],
): Promise<SpectotalRunResult> {
  if (!workspace) {
    return {
      diagnostics,
      profileId,
    };
  }

  const indexBundle = createIndexBundle(workspace, profileId);
  const workspaceAst = stripDerivedWorkspaceAst(workspace);

  return {
    workspaceAst,
    indexBundle,
    diagnostics,
    profileId,
  };
}

export async function runSpec(options: RunSpecOptions): Promise<SpectotalRunResult> {
  const diagnostics: string[] = [];
  const fileProvider = options.fileProvider ?? new NodeFileProvider();
  const profileId = options.profile.id;

  try {
    const preprocessed = await Preprocess.preprocess({
      entry: options.entry,
      configPath: options.configPath,
      fileProvider,
      env: options.env,
    });

    diagnostics.push(...((preprocessed as { diagnostics?: string[] }).diagnostics ?? []));

    const parseRegistry = buildParseRegistry(options.profile);
    const parsed = Parse.parseWithRegistry(preprocessed, parseRegistry);
    diagnostics.push(...(parsed.errors ?? []));

    if (!parsed.result) {
      return {
        diagnostics,
        profileId,
      };
    }

    const postprocessed = await postprocessDocumentAst({
      document: parsed.result.document,
      plugins: options.profile.postprocessPlugins ?? [],
      config: preprocessed.config,
    });

    diagnostics.push(...(postprocessed.errors ?? []));
    const workspace = postprocessed.workspace ?? singleDocumentWorkspace(parsed.result.document);

    return finalizeResult(workspace, profileId, diagnostics);
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

export async function postprocessDocumentWithProfile(
  options: PostprocessDocumentWithProfileOptions,
): Promise<SpectotalRunResult> {
  const diagnostics: string[] = [];
  const profileId = options.profile.id;

  try {
    const postprocessed = await postprocessDocumentAst({
      document: options.document,
      plugins: options.profile.postprocessPlugins ?? [],
      config: options.config,
    });

    diagnostics.push(...(postprocessed.errors ?? []));
    const workspace = postprocessed.workspace ?? singleDocumentWorkspace(options.document);

    return finalizeResult(workspace, profileId, diagnostics);
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

export async function postprocessWorkspaceWithProfile(
  options: PostprocessWorkspaceWithProfileOptions,
): Promise<SpectotalRunResult> {
  const diagnostics: string[] = [];
  const profileId = options.profile.id;

  try {
    const postprocessed = await postprocessWorkspaceAst({
      workspace: options.workspace as Workspace,
      plugins: options.profile.postprocessPlugins ?? [],
      configByDocumentId: options.configByDocumentId,
    });

    diagnostics.push(...(postprocessed.errors ?? []));
    const workspace = postprocessed.workspace ?? (options.workspace as Workspace);

    return finalizeResult(workspace, profileId, diagnostics);
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

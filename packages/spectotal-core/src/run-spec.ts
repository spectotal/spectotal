import { basename } from 'node:path';
import { createIndexBundle, stripDerivedWorkspaceAst } from './index-bundle.js';
import { NodeFileProvider } from './file-provider.js';
import { ProfileParserRegistry } from './parser-registry.js';
import type {
  Document,
  FileProvider,
  PostprocessDocumentWithProfileOptions,
  PostprocessWorkspaceWithProfileOptions,
  ProfileParseInput,
  RunSpecOptions,
  SpecConfig,
  SpectotalProfile,
  SpectotalRunResult,
  Workspace,
} from './types.js';

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeEntryId(entry: string): string {
  const fileName = basename(entry).replace(/\.[^.]+$/, '');
  return fileName || 'document';
}

function buildDefaultConfig(entry: string): SpecConfig {
  const id = normalizeEntryId(entry);
  return {
    id,
    deps: [],
    specIri: `urn:spectotal:${id}`,
  };
}

function mergeConfig<TConfig extends SpecConfig>(
  defaults: TConfig,
  override?: Partial<TConfig>,
): TConfig {
  if (!override) return defaults;
  return {
    ...defaults,
    ...override,
    deps: Array.isArray(override.deps) ? [...override.deps] : defaults.deps,
  } as TConfig;
}

async function defaultPreprocess<TConfig extends SpecConfig>(params: {
  entry: string;
  configPath?: string;
  fileProvider: FileProvider;
  defaultConfig: TConfig;
}): Promise<{ content: string; config: TConfig; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const content = await params.fileProvider.readFile(params.entry);
  let config = params.defaultConfig;

  if (params.configPath) {
    try {
      const configContent = await params.fileProvider.readFile(params.configPath);
      const parsed = JSON.parse(configContent) as Partial<TConfig>;
      config = mergeConfig(config, parsed);
    } catch (error) {
      diagnostics.push(`Failed to read config "${params.configPath}": ${asErrorMessage(error)}`);
    }
  }

  return {
    content,
    config,
    diagnostics,
  };
}

async function parseWithProfile<
  TDocument extends Document,
  TWorkspace extends Workspace<TDocument>,
  TConfig extends SpecConfig,
>(
  profile: SpectotalProfile<TDocument, TWorkspace, TConfig>,
  input: ProfileParseInput<TConfig>,
): Promise<{ document?: TDocument; diagnostics: string[] }> {
  const diagnostics: string[] = [];

  if (profile.parse) {
    const parsed = await profile.parse(input);
    diagnostics.push(...(parsed.diagnostics ?? []));
    return {
      document: parsed.document,
      diagnostics,
    };
  }

  if (!profile.registerParsers) {
    diagnostics.push(`Profile "${profile.id}" does not provide parse() or registerParsers().`);
    return { diagnostics };
  }

  const registry = new ProfileParserRegistry<TDocument, TConfig>();
  profile.registerParsers(registry);

  if (registry.parsers.length === 0) {
    diagnostics.push(`Profile "${profile.id}" registered no parsers.`);
    return { diagnostics };
  }

  for (const parser of registry.parsers) {
    try {
      const result = await parser.parse(input);
      diagnostics.push(...(result.diagnostics ?? []));
      if (result.document) {
        return {
          document: result.document,
          diagnostics,
        };
      }
    } catch (error) {
      diagnostics.push(`Parser "${parser.name}" failed: ${asErrorMessage(error)}`);
    }
  }

  return { diagnostics };
}

async function runPostprocessPlugins<TDocument extends Document, TConfig extends SpecConfig>(params: {
  document: TDocument;
  config: TConfig;
  profile: SpectotalProfile<TDocument, Workspace<TDocument>, TConfig>;
}): Promise<{ document: TDocument; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const plugins = [...(params.profile.postprocessPlugins ?? [])]
    .sort((left, right) => (left.order?.transform ?? 0) - (right.order?.transform ?? 0));

  let level = 0;
  for (const plugin of plugins) {
    if (!plugin.transform) continue;
    try {
      await plugin.transform({
        document: params.document,
        level,
        config: params.config,
      });
    } catch (error) {
      diagnostics.push(`Plugin "${plugin.name}" failed: ${asErrorMessage(error)}`);
    }
    level += 1;
  }

  return {
    document: params.document,
    diagnostics,
  };
}

function singleDocumentWorkspace<TDocument extends Document>(document: TDocument): Workspace<TDocument> {
  return {
    type: 'workspace',
    documents: [document],
  };
}

async function finalizeResult<TWorkspace extends Workspace>(params: {
  workspace: TWorkspace | undefined;
  profileId: string;
  diagnostics: string[];
  profile: SpectotalProfile<TWorkspace['documents'][number], TWorkspace>;
}): Promise<SpectotalRunResult<TWorkspace>> {
  if (!params.workspace) {
    return {
      diagnostics: params.diagnostics,
      profileId: params.profileId,
    };
  }

  const indexBundle = params.profile.buildIndexBundle
    ? params.profile.buildIndexBundle({ workspace: params.workspace, profileId: params.profileId })
    : createIndexBundle(params.workspace, params.profileId);

  const workspaceAst = stripDerivedWorkspaceAst(params.workspace);

  return {
    workspaceAst,
    indexBundle,
    diagnostics: params.diagnostics,
    profileId: params.profileId,
  };
}

export async function runSpec<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
>(options: RunSpecOptions<TDocument, TWorkspace, TConfig>): Promise<SpectotalRunResult<TWorkspace>> {
  const diagnostics: string[] = [];
  const fileProvider = options.fileProvider ?? new NodeFileProvider();
  const profile = options.profile;
  const profileId = profile.id;
  const baseConfig = mergeConfig(
    buildDefaultConfig(options.entry) as TConfig,
    options.defaultConfig,
  );

  try {
    const preprocessed = profile.preprocess
      ? await profile.preprocess({
          entry: options.entry,
          configPath: options.configPath,
          fileProvider,
          env: options.env,
          defaultConfig: baseConfig,
        })
      : await defaultPreprocess({
          entry: options.entry,
          configPath: options.configPath,
          fileProvider,
          defaultConfig: baseConfig,
        });

    diagnostics.push(...(preprocessed.diagnostics ?? []));

    const parsed = await parseWithProfile(profile, {
      entry: options.entry,
      content: preprocessed.content,
      configPath: options.configPath,
      config: preprocessed.config,
      fileProvider,
      env: options.env,
    });

    diagnostics.push(...parsed.diagnostics);

    if (!parsed.document) {
      return {
        diagnostics,
        profileId,
      };
    }

    let workspace: TWorkspace | Workspace<TDocument>;
    if (profile.postprocessDocument) {
      const postprocessed = await profile.postprocessDocument({
        document: parsed.document,
        config: preprocessed.config,
        fileProvider,
        env: options.env,
      });

      diagnostics.push(...(postprocessed.diagnostics ?? []));
      workspace = postprocessed.workspace ?? singleDocumentWorkspace(postprocessed.document ?? parsed.document);
    } else {
      const pluginResult = await runPostprocessPlugins({
        document: parsed.document,
        config: preprocessed.config,
        profile,
      });
      diagnostics.push(...pluginResult.diagnostics);
      workspace = singleDocumentWorkspace(pluginResult.document);
    }

    if (profile.postprocessWorkspace) {
      const postprocessedWorkspace = await profile.postprocessWorkspace({
        workspace: workspace as TWorkspace,
        fileProvider,
        env: options.env,
      });
      diagnostics.push(...(postprocessedWorkspace.diagnostics ?? []));
      workspace = postprocessedWorkspace.workspace ?? workspace;
    }

    return finalizeResult({
      workspace: workspace as TWorkspace,
      profileId,
      diagnostics,
      profile,
    });
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

export async function postprocessDocumentWithProfile<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
>(
  options: PostprocessDocumentWithProfileOptions<TDocument, TWorkspace, TConfig>,
): Promise<SpectotalRunResult<TWorkspace>> {
  const diagnostics: string[] = [];
  const fileProvider = options.fileProvider ?? new NodeFileProvider();
  const profileId = options.profile.id;
  const config = mergeConfig(
    buildDefaultConfig(options.document.id || 'document') as TConfig,
    options.config,
  );

  try {
    let workspace: TWorkspace | Workspace<TDocument>;

    if (options.profile.postprocessDocument) {
      const postprocessed = await options.profile.postprocessDocument({
        document: options.document,
        config,
        fileProvider,
        env: options.env,
      });

      diagnostics.push(...(postprocessed.diagnostics ?? []));
      workspace = postprocessed.workspace ?? singleDocumentWorkspace(postprocessed.document ?? options.document);
    } else {
      const pluginResult = await runPostprocessPlugins({
        document: options.document,
        config,
        profile: options.profile,
      });

      diagnostics.push(...pluginResult.diagnostics);
      workspace = singleDocumentWorkspace(pluginResult.document);
    }

    if (options.profile.postprocessWorkspace) {
      const postprocessedWorkspace = await options.profile.postprocessWorkspace({
        workspace: workspace as TWorkspace,
        fileProvider,
        env: options.env,
      });

      diagnostics.push(...(postprocessedWorkspace.diagnostics ?? []));
      workspace = postprocessedWorkspace.workspace ?? workspace;
    }

    return finalizeResult({
      workspace: workspace as TWorkspace,
      profileId,
      diagnostics,
      profile: options.profile,
    });
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

export async function postprocessWorkspaceWithProfile<
  TWorkspace extends Workspace = Workspace,
  TConfig extends SpecConfig = SpecConfig,
>(
  options: PostprocessWorkspaceWithProfileOptions<TWorkspace, TConfig>,
): Promise<SpectotalRunResult<TWorkspace>> {
  const diagnostics: string[] = [];
  const fileProvider = options.fileProvider ?? new NodeFileProvider();
  const profileId = options.profile.id;

  try {
    let workspace = options.workspace as TWorkspace;

    if (options.profile.postprocessWorkspace) {
      const postprocessed = await options.profile.postprocessWorkspace({
        workspace,
        configByDocumentId: options.configByDocumentId,
        fileProvider,
        env: options.env,
      });

      diagnostics.push(...(postprocessed.diagnostics ?? []));
      workspace = postprocessed.workspace ?? workspace;
    } else if (options.profile.postprocessPlugins && options.profile.postprocessPlugins.length > 0) {
      for (const [index, document] of workspace.documents.entries()) {
        const config = mergeConfig(
          buildDefaultConfig(document.id || `document-${index}`) as TConfig,
          options.configByDocumentId?.[document.id],
        );

        const pluginResult = await runPostprocessPlugins({
          document,
          config,
          profile: options.profile as SpectotalProfile<Document, Workspace<Document>, TConfig>,
        });
        diagnostics.push(...pluginResult.diagnostics);
      }
    }

    return finalizeResult({
      workspace,
      profileId,
      diagnostics,
      profile: options.profile,
    });
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

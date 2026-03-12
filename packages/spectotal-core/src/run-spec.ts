import { basename } from 'node:path';
import { createIndexBundle, stripDerivedWorkspaceAst } from './index-bundle.js';
import { NodeFileProvider } from './file-provider.js';
import { ProfileParserRegistry } from './parser-registry.js';
import { buildRelationGraph } from './relation-graph.js';
import type {
  DocumentProfileContext,
  Document,
  FileProvider,
  PostprocessDocumentWithProfileOptions,
  PostprocessWorkspaceWithProfileOptions,
  ProfileParseInput,
  RunSpecOptions,
  RunWorkspaceSpecOptions,
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
    dependsOn: [],
    specIri: `urn:spectotal:${id}`,
  };
}

function assertNoLegacyDepsKey(config: Partial<SpecConfig> | undefined): void {
  if (!config || typeof config !== 'object') return;
  if (!Object.prototype.hasOwnProperty.call(config, 'deps')) return;
  throw new Error('Legacy config key "deps" is not supported. Use "dependsOn" instead.');
}

function mergeConfig<TConfig extends SpecConfig>(
  defaults: TConfig,
  override?: Partial<TConfig>,
): TConfig {
  if (!override) return defaults;
  assertNoLegacyDepsKey(override);
  return {
    ...defaults,
    ...override,
    dependsOn: Array.isArray(override.dependsOn)
      ? [...override.dependsOn]
      : defaults.dependsOn,
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
      if (error instanceof Error && error.message.includes('Legacy config key "deps"')) {
        throw new Error(`Invalid config "${params.configPath}": ${error.message}`);
      }
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
  documentLevel: number;
  profile: SpectotalProfile<TDocument, Workspace<TDocument>, TConfig>;
}): Promise<{ document: TDocument; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const plugins = [...(params.profile.postprocessPlugins ?? [])]
    .sort((left, right) => (left.order?.transform ?? 0) - (right.order?.transform ?? 0));

  for (const plugin of plugins) {
    if (!plugin.transform) continue;
    try {
      await plugin.transform({
        document: params.document,
        level: params.documentLevel,
        config: params.config,
      });
    } catch (error) {
      diagnostics.push(`Plugin "${plugin.name}" failed: ${asErrorMessage(error)}`);
    }
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

function buildProfileContextByDocumentId<
  TWorkspace extends Workspace,
  TConfig extends SpecConfig,
>(params: {
  workspace: TWorkspace;
  configByDocumentId: Record<string, Partial<TConfig>>;
  profile: SpectotalProfile<TWorkspace['documents'][number], TWorkspace, TConfig>;
}): Record<string, DocumentProfileContext> | undefined {
  if (!params.profile.buildDocumentContext) {
    return undefined;
  }

  const contextByDocumentId: Record<string, DocumentProfileContext> = {};
  for (const [index, document] of params.workspace.documents.entries()) {
    const defaultConfig = buildDefaultConfig(document.id || `document-${index}`) as TConfig;
    const config = mergeConfig(defaultConfig, params.configByDocumentId[document.id]);
    const context = params.profile.buildDocumentContext({
      document,
      config,
    });
    if (context && typeof context === 'object') {
      contextByDocumentId[document.id] = context;
    }
  }

  return Object.keys(contextByDocumentId).length > 0 ? contextByDocumentId : undefined;
}

async function finalizeResult<TWorkspace extends Workspace, TConfig extends SpecConfig>(params: {
  workspace: TWorkspace | undefined;
  profileId: string;
  diagnostics: string[];
  profile: SpectotalProfile<TWorkspace['documents'][number], TWorkspace, TConfig>;
  configByDocumentId: Record<string, Partial<TConfig>>;
}): Promise<SpectotalRunResult<TWorkspace>> {
  if (!params.workspace) {
    return {
      diagnostics: params.diagnostics,
      profileId: params.profileId,
    };
  }

  const relationGraph = buildRelationGraph({
    workspace: params.workspace,
    configByDocumentId: params.configByDocumentId,
  });
  const profileContextByDocumentId = buildProfileContextByDocumentId({
    workspace: params.workspace,
    configByDocumentId: params.configByDocumentId,
    profile: params.profile,
  });

  const indexBundle = params.profile.buildIndexBundle
    ? params.profile.buildIndexBundle({
      workspace: params.workspace,
      profileId: params.profileId,
      configByDocumentId: params.configByDocumentId,
      relationGraph,
      profileContextByDocumentId,
    })
    : createIndexBundle(params.workspace, params.profileId, {
      relationGraph,
      profileContextByDocumentId,
    });

  const workspaceAst = stripDerivedWorkspaceAst(params.workspace);

  return {
    workspaceAst,
    indexBundle,
    diagnostics: params.diagnostics,
    profileId: params.profileId,
  };
}

function normalizeConfigByDocumentId<
  TWorkspace extends Workspace,
  TConfig extends SpecConfig,
>(params: {
  workspace: TWorkspace;
  configByDocumentId: Record<string, Partial<TConfig>>;
}): Record<string, Partial<TConfig>> {
  const normalized: Record<string, Partial<TConfig>> = {};
  for (const [index, document] of params.workspace.documents.entries()) {
    const config = mergeConfig(
      buildDefaultConfig(document.id || `document-${index}`) as TConfig,
      params.configByDocumentId[document.id],
    );
    normalized[document.id] = config;
  }
  return normalized;
}

function collectPostprocessedDocuments<
  TDocument extends Document,
  TWorkspace extends Workspace<TDocument>,
>(params: {
  fallbackDocument: TDocument;
  postprocessed:
    | {
        document?: TDocument;
        workspace?: TWorkspace;
      }
    | undefined;
}): TDocument[] {
  const workspaceDocuments = params.postprocessed?.workspace?.documents;
  if (Array.isArray(workspaceDocuments) && workspaceDocuments.length > 0) {
    return [...workspaceDocuments];
  }
  if (params.postprocessed?.document) {
    return [params.postprocessed.document];
  }
  return [params.fallbackDocument];
}

export async function runWorkspaceSpec<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
>(
  options: RunWorkspaceSpecOptions<TDocument, TWorkspace, TConfig>,
): Promise<SpectotalRunResult<TWorkspace>> {
  const diagnostics: string[] = [];
  const fileProvider = options.fileProvider ?? new NodeFileProvider();
  const profile = options.profile;
  const profileId = profile.id;

  try {
    const parsedEntries: Array<{
      entry: string;
      configPath?: string;
      config: TConfig;
      document: TDocument;
    }> = [];

    for (const entryOptions of options.entries) {
      const baseConfig = mergeConfig(
        buildDefaultConfig(entryOptions.entry) as TConfig,
        entryOptions.defaultConfig,
      );

      const preprocessed = profile.preprocess
        ? await profile.preprocess({
            entry: entryOptions.entry,
            configPath: entryOptions.configPath,
            fileProvider,
            env: options.env,
            defaultConfig: baseConfig,
          })
        : await defaultPreprocess({
            entry: entryOptions.entry,
            configPath: entryOptions.configPath,
            fileProvider,
            defaultConfig: baseConfig,
          });

      diagnostics.push(...(preprocessed.diagnostics ?? []));

      const parsed = await parseWithProfile(profile, {
        entry: entryOptions.entry,
        content: preprocessed.content,
        configPath: entryOptions.configPath,
        config: preprocessed.config,
        fileProvider,
        env: options.env,
      });

      diagnostics.push(...parsed.diagnostics);

      if (!parsed.document) {
        continue;
      }

      parsedEntries.push({
        entry: entryOptions.entry,
        configPath: entryOptions.configPath,
        config: preprocessed.config,
        document: parsed.document,
      });
    }

    if (parsedEntries.length === 0) {
      return {
        diagnostics,
        profileId,
      };
    }

    const documents: TDocument[] = [];
    const configByDocumentId: Record<string, Partial<TConfig>> = {};
    const firstSourceByDocumentId = new Map<string, string>();

    for (const [entryIndex, parsedEntry] of parsedEntries.entries()) {
      const candidateDocuments: TDocument[] = [];
      if (profile.postprocessDocument) {
        const postprocessed = await profile.postprocessDocument({
          document: parsedEntry.document,
          config: parsedEntry.config,
          fileProvider,
          env: options.env,
        });
        diagnostics.push(...(postprocessed.diagnostics ?? []));
        candidateDocuments.push(...collectPostprocessedDocuments({
          fallbackDocument: parsedEntry.document,
          postprocessed,
        }));
      } else {
        const pluginResult = await runPostprocessPlugins({
          document: parsedEntry.document,
          config: parsedEntry.config,
          documentLevel: entryIndex,
          profile: profile as SpectotalProfile<TDocument, Workspace<TDocument>, TConfig>,
        });
        diagnostics.push(...pluginResult.diagnostics);
        candidateDocuments.push(pluginResult.document);
      }

      for (const candidateDocument of candidateDocuments) {
        const candidateId = typeof candidateDocument.id === 'string'
          ? candidateDocument.id.trim()
          : '';
        if (!candidateId) {
          diagnostics.push(
            `Skipped document from "${parsedEntry.entry}" because it does not have a valid non-empty id.`,
          );
          continue;
        }

        const sourceFile = candidateDocument.sourcePos?.file ?? parsedEntry.entry;
        const originalSource = firstSourceByDocumentId.get(candidateId);
        if (originalSource) {
          diagnostics.push(
            `Duplicate document id "${candidateId}" in "${sourceFile}". Keeping first occurrence from "${originalSource}".`,
          );
          continue;
        }

        candidateDocument.id = candidateId;
        firstSourceByDocumentId.set(candidateId, sourceFile);
        configByDocumentId[candidateId] = parsedEntry.config;
        documents.push(candidateDocument);
      }
    }

    if (documents.length === 0) {
      return {
        diagnostics,
        profileId,
      };
    }

    let workspace: TWorkspace | Workspace<TDocument> = {
      type: 'workspace',
      documents,
    };

    if (profile.postprocessWorkspace) {
      const postprocessedWorkspace = await profile.postprocessWorkspace({
        workspace: workspace as TWorkspace,
        configByDocumentId,
        fileProvider,
        env: options.env,
      });
      diagnostics.push(...(postprocessedWorkspace.diagnostics ?? []));
      workspace = postprocessedWorkspace.workspace ?? workspace;
    }

    const normalizedConfigByDocumentId = normalizeConfigByDocumentId({
      workspace: workspace as TWorkspace,
      configByDocumentId,
    });

    return finalizeResult({
      workspace: workspace as TWorkspace,
      profileId,
      diagnostics,
      profile,
      configByDocumentId: normalizedConfigByDocumentId,
    });
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

export async function runSpec<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
>(options: RunSpecOptions<TDocument, TWorkspace, TConfig>): Promise<SpectotalRunResult<TWorkspace>> {
  return runWorkspaceSpec({
    entries: [{
      entry: options.entry,
      configPath: options.configPath,
      defaultConfig: options.defaultConfig,
    }],
    fileProvider: options.fileProvider,
    env: options.env,
    profile: options.profile,
  });
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

  try {
    const config = mergeConfig(
      buildDefaultConfig(options.document.id || 'document') as TConfig,
      options.config,
    );
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
        documentLevel: 0,
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

    const configByDocumentId: Record<string, Partial<TConfig>> = {};
    for (const document of workspace.documents) {
      configByDocumentId[document.id] = config;
    }

    return finalizeResult({
      workspace: workspace as TWorkspace,
      profileId,
      diagnostics,
      profile: options.profile,
      configByDocumentId,
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
    const normalizedConfigByDocumentId: Record<string, Partial<TConfig>> = {};
    workspace.documents.forEach((document, index) => {
      const config = mergeConfig(
        buildDefaultConfig(document.id || `document-${index}`) as TConfig,
        options.configByDocumentId?.[document.id],
      );
      normalizedConfigByDocumentId[document.id] = config;
    });

    if (options.profile.postprocessWorkspace) {
      const postprocessed = await options.profile.postprocessWorkspace({
        workspace,
        configByDocumentId: normalizedConfigByDocumentId,
        fileProvider,
        env: options.env,
      });

      diagnostics.push(...(postprocessed.diagnostics ?? []));
      workspace = postprocessed.workspace ?? workspace;
    } else if (options.profile.postprocessPlugins && options.profile.postprocessPlugins.length > 0) {
      for (const [index, document] of workspace.documents.entries()) {
        const config = mergeConfig(
          buildDefaultConfig(document.id || `document-${index}`) as TConfig,
          normalizedConfigByDocumentId[document.id],
        );

        const pluginResult = await runPostprocessPlugins({
          document,
          config,
          documentLevel: index,
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
      configByDocumentId: normalizedConfigByDocumentId,
    });
  } catch (error) {
    diagnostics.push(asErrorMessage(error));
    return {
      diagnostics,
      profileId,
    };
  }
}

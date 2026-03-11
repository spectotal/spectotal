/**
 * Pipeline Runner
 *
 * Orchestrates plugin execution across postprocess phases.
 * Parsing is handled by parser modules registered via html/index and markdown/index.
 */

import type { FileProvider } from '#src/file-provider/types';
import { preprocess } from '#src/preprocess/pipeline';
import { parseWithRegistry } from '#src/parse/pipeline';
import { ParseHandlerRegistry } from '#src/parse/registry';
import { coreHtmlParsers, coreMarkdownParsers } from '#src/parse/parsers';
import type {
    Plugin,
    PostprocessPhase,
    SpeculateResult,
    RuntimeWorkspace,
} from './types.js';
import type { Document, DocumentMetadata, Workspace } from '#src/types/ast.generated';
import type { SpecConfig } from '#src/preprocess/types';
import {
    finalizeWorkspace
} from './workspace-index.js';

interface PipelineDocumentInput {
    doc: Document;
    entry: string;
    config: SpecConfig;
}

// Default order for plugins that don't specify
const DEFAULT_ORDER = 100;

/**
 * Get plugin order for a specific phase
 */
function getPluginOrder(plugin: Plugin, phase: PostprocessPhase): number {
    return plugin.order?.[phase] ?? DEFAULT_ORDER;
}

/**
 * Sort plugins by order for a given phase
 */
function sortPluginsForPhase(plugins: Plugin[], phase: PostprocessPhase): Plugin[] {
    return [...plugins].sort((a, b) => getPluginOrder(a, phase) - getPluginOrder(b, phase));
}

/**
 * Register core parser modules to a registry
 */
function registerCoreParsers(registry: ParseHandlerRegistry): void {
    for (const parser of coreHtmlParsers) {
        registry.registerHtmlParser(parser);
    }
    for (const parser of coreMarkdownParsers) {
        registry.registerMarkdownParser(parser);
    }
}

function asNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function inferSpecIriFromMetadata(metadata?: DocumentMetadata): string | undefined {
    const custom = metadata?.custom;
    if (!custom || typeof custom !== 'object') return undefined;

    const customRecord = custom as Record<string, unknown>;
    return asNonEmptyString(customRecord.specIri)
        ?? asNonEmptyString(customRecord.specIRI)
        ?? asNonEmptyString(customRecord.thisVersion)
        ?? asNonEmptyString(customRecord.spec_iri);
}

function inferSpecProfileFromMetadata(metadata?: DocumentMetadata): string | undefined {
    const custom = metadata?.custom;
    if (!custom || typeof custom !== 'object') return undefined;
    return asNonEmptyString((custom as Record<string, unknown>).specProfile);
}

function mergeDefinedConfig(base: SpecConfig, override?: Partial<SpecConfig>): SpecConfig {
    if (!override) return base;

    const definedOverride = Object.fromEntries(
        Object.entries(override).filter((entry) => entry[1] !== undefined)
    ) as Partial<SpecConfig>;

    const merged: SpecConfig = { ...base, ...definedOverride };

    // Keep required fields stable after merge.
    merged.id = asNonEmptyString(override.id) ?? base.id;
    merged.specIri = asNonEmptyString(override.specIri) ?? base.specIri;
    if (Array.isArray(override.deps)) {
        merged.deps = override.deps;
    } else {
        merged.deps = base.deps;
    }

    return merged;
}

function inferConfigFromDocument(document: Document, override?: Partial<SpecConfig>): { config?: SpecConfig; errors: string[] } {
    const errors: string[] = [];

    const id = asNonEmptyString(override?.id) ?? asNonEmptyString(document.id);
    if (!id) {
        errors.push('Unable to infer config.id from document AST. Provide config override with id.');
        return { errors };
    }

    const metadata = document.metadata;
    const inferredSpecIri = asNonEmptyString(override?.specIri)
        ?? inferSpecIriFromMetadata(metadata)
        ?? id;

    const baseConfig: SpecConfig = {
        id,
        deps: Array.isArray(metadata?.deps) ? metadata.deps : [],
        specIri: inferredSpecIri,
    };
    const inferredSpecProfile = inferSpecProfileFromMetadata(metadata);
    if (inferredSpecProfile) {
        baseConfig.specProfile = inferredSpecProfile;
    }

    if (metadata?.title) baseConfig.title = metadata.title;
    if (metadata?.shortName) baseConfig.shortName = metadata.shortName;
    if (metadata?.subtitle) baseConfig.subtitle = metadata.subtitle;
    if (metadata?.status) baseConfig.status = metadata.status;
    if (metadata?.maturityLevel) baseConfig.maturityLevel = metadata.maturityLevel;
    if (metadata?.publishDate) baseConfig.publishDate = metadata.publishDate;
    if (metadata?.creationDate) baseConfig.creationDate = metadata.creationDate;
    if (metadata?.lastUpdateDate) baseConfig.lastUpdateDate = metadata.lastUpdateDate;
    if (metadata?.version) baseConfig.version = metadata.version;
    if (metadata?.abstract) baseConfig.abstract = metadata.abstract;
    if (metadata?.copyright) baseConfig.copyright = metadata.copyright;
    if (metadata?.license) baseConfig.license = metadata.license;

    if (metadata?.editors) {
        const normalizedEditors = metadata.editors
            .filter((editor) => asNonEmptyString(editor.name))
            .map((editor) => ({
                name: editor.name as string,
                url: editor.url,
                company: editor.company,
                note: editor.note,
                w3cid: editor.w3cid,
            }));
        if (normalizedEditors.length > 0) {
            baseConfig.editors = normalizedEditors;
        }
    }

    if (metadata?.authors) {
        const normalizedAuthors = metadata.authors
            .filter((author) => asNonEmptyString(author.name))
            .map((author) => ({
                name: author.name as string,
                url: author.url,
                company: author.company,
                note: author.note,
                w3cid: author.w3cid,
            }));
        if (normalizedAuthors.length > 0) {
            baseConfig.authors = normalizedAuthors;
        }
    }

    if (metadata?.logos) {
        baseConfig.logos = metadata.logos.map((logo) => ({ ...logo }));
    }

    if (metadata?.repository) {
        if (typeof metadata.repository === 'string') {
            baseConfig.repository = metadata.repository;
        } else if (asNonEmptyString(metadata.repository.url)) {
            baseConfig.repository = {
                url: metadata.repository.url,
                branch: metadata.repository.branch,
                type: metadata.repository.repoType,
            };
        }
    }

    if (metadata?.group) {
        if (typeof metadata.group === 'string') {
            baseConfig.group = metadata.group;
        } else if (asNonEmptyString(metadata.group.name)) {
            baseConfig.group = {
                name: metadata.group.name,
                url: metadata.group.url,
            };
        }
    }

    if (metadata?.custom && typeof metadata.custom === 'object') {
        baseConfig.custom = { ...metadata.custom } as Record<string, unknown>;
    }

    const merged = mergeDefinedConfig(baseConfig, override);

    if (!asNonEmptyString(merged.id)) {
        errors.push('Postprocess config is missing required id.');
    }
    if (!asNonEmptyString(merged.specIri)) {
        errors.push('Postprocess config is missing required specIri.');
    }
    if (!Array.isArray(merged.deps)) {
        errors.push('Postprocess config has invalid deps; expected string array.');
    }

    if (errors.length > 0) return { errors };
    return { config: merged, errors: [] };
}

function resetDerivedDocumentFields(document: Document): void {
    delete document.indexes;
    delete document.computed;
}

function deriveEntryKey(document: Document, index: number): string {
    return asNonEmptyString(document.sourcePos?.file) ?? `memory://speculator-ast/${document.id || `doc-${index + 1}`}.ast`;
}

function withUniqueEntries(inputs: PipelineDocumentInput[]): PipelineDocumentInput[] {
    const seen = new Map<string, number>();

    return inputs.map((input) => {
        const count = seen.get(input.entry) ?? 0;
        seen.set(input.entry, count + 1);

        if (count === 0) return input;
        return {
            ...input,
            entry: `${input.entry}#${count + 1}`,
        };
    });
}

/**
 * Speculator Pipeline Runner
 *
 * Coordinates execution of plugins across pipeline phases.
 * In a workspace-first architecture, all runs produce a Workspace AST.
 */
export class SpeculatorPipeline {
    private plugins: Plugin[];

    constructor(plugins: Plugin[] = []) {
        this.plugins = plugins;
    }

    /**
     * Run the pipeline for a single document.
     * Consolidates to runWorkspace internally.
     */
    async run(options: {
        entry: string;
        configPath?: string;
        fileProvider: FileProvider;
        env?: Record<string, string | undefined>;
    }): Promise<SpeculateResult> {
        return this.runWorkspace({
            entries: [{ entry: options.entry, configPath: options.configPath }],
            fileProvider: options.fileProvider,
            env: options.env
        });
    }

    /**
     * Run postprocess phases on a prebuilt document AST.
     */
    async runDocumentAst(options: {
        document: Document;
        config?: Partial<SpecConfig>;
    }): Promise<SpeculateResult> {
        const clonedDocument = structuredClone(options.document);
        resetDerivedDocumentFields(clonedDocument);

        const inferred = inferConfigFromDocument(clonedDocument, options.config);
        if (!inferred.config) {
            return { errors: inferred.errors };
        }

        const entry = deriveEntryKey(clonedDocument, 0);
        const workspace = await this.executePostprocess([
            { doc: clonedDocument, entry, config: inferred.config }
        ]);

        return { workspace, errors: undefined };
    }

    /**
     * Run postprocess phases on a prebuilt workspace AST.
     */
    async runWorkspaceAst(options: {
        workspace: Workspace;
        configByDocumentId?: Record<string, Partial<SpecConfig>>;
    }): Promise<SpeculateResult> {
        const documents = options.workspace.documents.map((document) => structuredClone(document));
        const errors: string[] = [];
        const inputs: PipelineDocumentInput[] = [];

        for (let index = 0; index < documents.length; index++) {
            const doc = documents[index];
            resetDerivedDocumentFields(doc);

            const override = options.configByDocumentId?.[doc.id];
            const inferred = inferConfigFromDocument(doc, override);
            if (!inferred.config) {
                const docLabel = doc.id || `document-${index + 1}`;
                errors.push(...inferred.errors.map((err) => `[${docLabel}] ${err}`));
                continue;
            }

            inputs.push({
                doc,
                entry: deriveEntryKey(doc, index),
                config: inferred.config,
            });
        }

        if (inputs.length === 0) {
            return { errors: errors.length > 0 ? errors : ['No documents available for postprocess.'] };
        }

        const workspace = await this.executePostprocess(inputs);
        return { workspace, errors: errors.length > 0 ? errors : undefined };
    }

    /**
     * Run the complete pipeline for a workspace (one or more documents)
     */
    async runWorkspace(options: {
        entries: { entry: string; configPath?: string }[];
        fileProvider: FileProvider;
        env?: Record<string, string | undefined>;
    }): Promise<SpeculateResult> {
        const results: PipelineDocumentInput[] = [];
        const errors: string[] = [];

        // 1. Initial run: Preprocess + Parse
        for (const entryConfig of options.entries) {
            try {
                const preprocessedSpec = await preprocess({
                    entry: entryConfig.entry,
                    configPath: entryConfig.configPath,
                    fileProvider: options.fileProvider,
                    env: options.env,
                });
                if (preprocessedSpec.diagnostics && preprocessedSpec.diagnostics.length > 0) {
                    for (const diagnostic of preprocessedSpec.diagnostics) {
                        errors.push(`Config diagnostic for ${entryConfig.entry}: ${diagnostic}`);
                    }
                }

                const registry = new ParseHandlerRegistry();
                registerCoreParsers(registry);
                const parseResult = parseWithRegistry(preprocessedSpec, registry);

                if (parseResult.errors && parseResult.errors.length > 0) {
                    errors.push(...parseResult.errors);
                }

                if (!parseResult.result) continue;
                results.push({
                    doc: parseResult.result.document,
                    entry: entryConfig.entry,
                    config: preprocessedSpec.config
                });
            } catch (err) {
                // Preprocess errors are now collected instead of just throwing
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`Error processing ${entryConfig.entry}: ${msg}`);
                continue;
            }
        }

        if (results.length === 0) {
            return { errors: errors.length > 0 ? errors : undefined };
        }

        const workspace = await this.executePostprocess(results);

        return { workspace, errors: errors.length > 0 ? errors : undefined };
    }

    private async executePostprocess(inputs: PipelineDocumentInput[]): Promise<Workspace> {
        const results = withUniqueEntries(inputs);

        const runtimeWorkspace: RuntimeWorkspace = {
            documents: new Map(results.map((r) => [r.entry, r.doc])),
            documentLevels: new Map(results.map((r, i) => [r.entry, i])),
            globalIndex: { definitions: new Map(), bibliography: new Map() }
        };

        // 1. TRANSFORM phase
        const transformPlugins = sortPluginsForPhase(this.plugins.filter((p) => p.transform), 'transform');
        for (const res of results) {
            const level = runtimeWorkspace.documentLevels.get(res.entry) ?? 0;
            for (const plugin of transformPlugins) {
                await plugin.transform!({
                    document: res.doc,
                    level,
                    workspace: runtimeWorkspace,
                    config: res.config
                });
            }
        }

        // 2. INDEX phase
        const indexPlugins = sortPluginsForPhase(this.plugins.filter((p) => p.index), 'index');
        for (const res of results) {
            const level = runtimeWorkspace.documentLevels.get(res.entry) ?? 0;
            for (const plugin of indexPlugins) {
                await plugin.index!({
                    document: res.doc,
                    level,
                    workspace: runtimeWorkspace,
                    config: res.config
                });
            }
        }

        // 3. RESOLVE phase
        const resolvePlugins = sortPluginsForPhase(this.plugins.filter((p) => p.resolve), 'resolve');
        for (const res of results) {
            const level = runtimeWorkspace.documentLevels.get(res.entry) ?? 0;
            for (const plugin of resolvePlugins) {
                await plugin.resolve!({
                    document: res.doc,
                    level,
                    workspace: runtimeWorkspace,
                    config: res.config
                });
            }
        }

        // 4. COMPUTE phase
        const computePlugins = sortPluginsForPhase(this.plugins.filter((p) => p.compute), 'compute');
        for (const res of results) {
            const level = runtimeWorkspace.documentLevels.get(res.entry) ?? 0;
            for (const plugin of computePlugins) {
                await plugin.compute!({
                    document: res.doc,
                    level,
                    workspace: runtimeWorkspace,
                    config: res.config
                });
            }
        }

        // 5. FINALIZE Workspace AST
        return finalizeWorkspace(
            runtimeWorkspace.documents,
            runtimeWorkspace.globalIndex
        );
    }
}

/**
 * Pipeline Entrypoint
 * 
 * Single entrypoint for processing specifications with plugins.
 */

import { NodeFileProvider } from '#src/file-provider/node';
import type { FileProvider } from '#src/file-provider/types';
import { SpeculatorPipeline } from './runner.js';
import type {
    PostprocessDocumentAstOptions,
    PostprocessWorkspaceAstOptions,
    SpeculateOptions,
    SpeculateResult
} from './types.js';

// Re-export types
export type {
    Plugin,
    Phase,
    PostprocessPhase,
    PostprocessDocumentAstOptions,
    PostprocessWorkspaceAstOptions,
    SpeculateOptions,
    SpeculateResult,
    Workspace
} from './types.js';

export { SpeculatorPipeline } from './runner.js';
export { PHASES, POSTPROCESS_PHASES } from './types.js';


/**
 * Process a specification with the given plugins.
 * 
 * This is the main entrypoint for the speculator pipeline.
 * 
 * @param options - Pipeline options including entry, config, and plugins
 * @returns Result with document and diagnostics
 * 
 * @example
 * ```typescript
 * import { speculate, coreMarkdownPlugin, coreHtmlPlugin } from 'speculator';
 * 
 * const result = await speculate({
 *   entry: './spec/index.md',
 *   configPath: './spec/config.respec.json',
 *   plugins: [coreMarkdownPlugin, coreHtmlPlugin],
 * });
 * 
 * if (!result.hasErrors) {
 *   console.log(result.document);
 * }
 * ```
 */
export async function speculate(options: SpeculateOptions): Promise<SpeculateResult> {
    // Use provided file provider or default to Node
    const fileProvider: FileProvider = options.fileProvider ?? new NodeFileProvider();

    // Create pipeline with plugins
    const pipeline = new SpeculatorPipeline(options.plugins);


    // Run the pipeline
    return pipeline.run({
        entry: options.entry,
        configPath: options.configPath,
        fileProvider,
        env: options.env,
    });
}

/**
 * Run postprocess phases on a prebuilt document AST.
 */
export async function postprocessDocumentAst(options: PostprocessDocumentAstOptions): Promise<SpeculateResult> {
    const pipeline = new SpeculatorPipeline(options.plugins);
    return pipeline.runDocumentAst({
        document: options.document,
        config: options.config,
    });
}

/**
 * Run postprocess phases on a prebuilt workspace AST.
 */
export async function postprocessWorkspaceAst(options: PostprocessWorkspaceAstOptions): Promise<SpeculateResult> {
    const pipeline = new SpeculatorPipeline(options.plugins);
    return pipeline.runWorkspaceAst({
        workspace: options.workspace,
        configByDocumentId: options.configByDocumentId,
    });
}

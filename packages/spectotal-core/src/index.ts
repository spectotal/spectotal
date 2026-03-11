export { runSpec, postprocessDocumentWithProfile, postprocessWorkspaceWithProfile } from './run-spec.js';
export { ProfileParserRegistry } from './parser-registry.js';
export { SpectotalProfileRegistry, createProfileRegistry } from './profile-registry.js';
export {
  createIndexBundle,
  stripDerivedWorkspaceAst,
  hydrateWorkspaceFromIndexBundle,
} from './index-bundle.js';
export { createCoreValidationAdapter } from './validator-adapter.js';

export type {
  IndexBundle,
  IndexBundleDocument,
  PostprocessDocumentWithProfileOptions,
  PostprocessWorkspaceWithProfileOptions,
  ProfileParserRegistry as IProfileParserRegistry,
  RunSpecOptions,
  SpectotalProfile,
  SpectotalRunResult,
  StructuralDocumentAst,
  StructuralWorkspaceAst,
} from './types.js';
export type { CoreValidationAdapter, CoreValidationAdapterResult } from './validator-adapter.js';

export {
  MemoryFileProvider,
  NodeFileProvider,
  Parse,
  Preprocess,
  coreHtmlParsers,
  coreMarkdownParsers,
  corePlugins,
  validateAST,
} from '@openuji/speculator';

export type {
  Document,
  FileProvider,
  IndexDefinitionEntry,
  InlineLink,
  InlineReference,
  Inline,
  NormativeLevel,
  Plugin,
  SourcePos,
  SpecConfig,
  ValidationError,
  ValidationMode,
  ValidationResult,
  Workspace,
} from '@openuji/speculator';

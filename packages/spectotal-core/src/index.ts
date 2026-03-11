export { runSpec, postprocessDocumentWithProfile, postprocessWorkspaceWithProfile } from './run-spec.js';
export { ProfileParserRegistry } from './parser-registry.js';
export { SpectotalProfileRegistry, createProfileRegistry } from './profile-registry.js';
export {
  createIndexBundle,
  stripDerivedWorkspaceAst,
  hydrateWorkspaceFromIndexBundle,
} from './index-bundle.js';
export { createCoreValidationAdapter } from './validator-adapter.js';
export { MemoryFileProvider, NodeFileProvider } from './file-provider.js';
export { Parse, inferLevel } from './parse-utils.js';

export type {
  AstNode,
  ComputedMap,
  DocumentMetadata,
  Document,
  FileProvider,
  IndexDefinitionEntry,
  IndexBundle,
  IndexBundleDocument,
  IndexMap,
  Inline,
  InlineLink,
  InlineReference,
  NormativeLevel,
  Plugin,
  PluginTransformContext,
  PostprocessDocumentWithProfileOptions,
  PostprocessWorkspaceWithProfileOptions,
  ProfileParseInput,
  ProfileParseResult,
  ProfileParser,
  ProfileParserRegistry as IProfileParserRegistry,
  ProfilePostprocessDocumentOptions,
  ProfilePostprocessDocumentResult,
  ProfilePostprocessWorkspaceOptions,
  ProfilePostprocessWorkspaceResult,
  ProfilePreprocessOptions,
  ProfilePreprocessResult,
  RunSpecOptions,
  Section,
  SourcePos,
  SpecConfig,
  SpectotalProfile,
  SpectotalRunResult,
  StructuralDocumentAst,
  StructuralWorkspaceAst,
  TocEntry,
  ValidationError,
  ValidationMode,
  ValidationResult,
  Block,
  BlockHeading,
  BlockNote,
  BlockParagraph,
  Workspace,
  InlineText,
  InlineWorkspaceDfnReference,
  InlineWorkspaceIdlReference,
  InlineWorkspaceElementReference,
  InlineExternalDfnReference,
  InlineExternalIdlReference,
  InlineExternalElementReference,
} from './types.js';

export type { CoreValidationAdapter, CoreValidationAdapterResult, ValidationFunction } from './validator-adapter.js';

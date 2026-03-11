import type {
  Document,
  FileProvider,
  Plugin,
  SpecConfig,
  Workspace,
} from '@openuji/speculator';

export interface ProfileParserRegistry {
  registerHtmlParser(parser: unknown): void;
  registerMarkdownParser(parser: unknown): void;
}

export interface SpectotalProfile {
  id: string;
  registerParsers?(registry: ProfileParserRegistry): void;
  postprocessPlugins?: Plugin[];
}

export type StructuralDocumentAst = Omit<Document, 'indexes' | 'computed'>;

export type StructuralWorkspaceAst = Omit<Workspace, 'documents' | 'globalIndex'> & {
  documents: StructuralDocumentAst[];
};

export interface IndexBundleDocument {
  documentId: string;
  sourceFile?: string;
  indexes?: Document['indexes'];
  computed?: Document['computed'];
}

export interface IndexBundle {
  schemaVersion: '1.0.0';
  profileId: string;
  globalIndex?: Workspace['globalIndex'];
  documents: IndexBundleDocument[];
}

export interface RunSpecOptions {
  entry: string;
  configPath?: string;
  fileProvider?: FileProvider;
  env?: Record<string, string | undefined>;
  profile: SpectotalProfile;
}

export interface PostprocessDocumentWithProfileOptions {
  document: Document;
  profile: SpectotalProfile;
  config?: Partial<SpecConfig>;
}

export interface PostprocessWorkspaceWithProfileOptions {
  workspace: Workspace | StructuralWorkspaceAst;
  profile: SpectotalProfile;
  configByDocumentId?: Record<string, Partial<SpecConfig>>;
}

export interface SpectotalRunResult {
  workspaceAst?: StructuralWorkspaceAst;
  indexBundle?: IndexBundle;
  diagnostics: string[];
  profileId: string;
}

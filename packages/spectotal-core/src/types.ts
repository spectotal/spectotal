export interface SourcePos {
  file: string;
  line: number;
  column: number;
  offset?: number;
  endLine?: number;
  endColumn?: number;
  endOffset?: number;
}

export type ValidationMode = 'full' | 'structure-only' | (string & {});

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export type IndexMap = Record<string, any>;
export type ComputedMap = Record<string, any>;

export interface AstNode {
  type: string;
  id?: string;
  sourcePos?: SourcePos;
  children?: AstNode[];
  [key: string]: any;
}

export interface SpecConfig {
  id: string;
  dependsOn: string[];
  specIri: string;
  [key: string]: any;
}

export interface Document<
  TNode extends AstNode = AstNode,
  TIndexes extends IndexMap = IndexMap,
  TComputed extends ComputedMap = ComputedMap,
> extends AstNode {
  type: 'document';
  id: string;
  children: TNode[];
  indexes?: TIndexes;
  computed?: TComputed;
  metadata?: Record<string, any>;
  profileContext?: Record<string, unknown>;
}

export interface Workspace<
  TDocument extends Document = Document,
  TGlobalIndex extends IndexMap = IndexMap,
> extends AstNode {
  type: 'workspace';
  documents: TDocument[];
  globalIndex?: TGlobalIndex;
}

export type Block = any;
export type BlockHeading = any;
export type BlockNote = any;
export type BlockParagraph = any;
export type Inline = any;
export type InlineLink = any;
export type InlineReference = any;
export type InlineText = any;
export type InlineWorkspaceDfnReference = any;
export type InlineWorkspaceIdlReference = any;
export type InlineWorkspaceElementReference = any;
export type InlineExternalDfnReference = any;
export type InlineExternalIdlReference = any;
export type InlineExternalElementReference = any;
export type Section = any;
export type TocEntry = any;
export type DocumentProfileContext = Record<string, unknown>;
export type DocumentMetadata = DocumentProfileContext;
export type IndexDefinitionEntry = any;

export type RelationKind = 'dependsOn';

export interface RelationGraphNode {
  documentId: string;
  sourceFile?: string;
}

export interface RelationGraphEdge {
  kind: RelationKind;
  fromDocumentId: string;
  toDocumentId: string;
}

export interface RelationGraphDiagnostic {
  code: 'unknown-dependency' | 'self-dependency' | 'cycle';
  message: string;
  documentId?: string;
  dependencyId?: string;
  cycle?: string[];
}

export interface RelationGraph {
  schemaVersion: '1.0.0';
  relationKind: RelationKind;
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
  topologicalOrder: string[];
  directDependenciesByDocumentId: Record<string, string[]>;
  transitiveDependenciesByDocumentId: Record<string, string[]>;
  diagnostics: RelationGraphDiagnostic[];
}

export interface FileProvider {
  readFile(filePath: string): Promise<string>;
  exists?(filePath: string): Promise<boolean>;
}

export interface PluginTransformContext<
  TDocument extends Document = Document,
  TConfig extends SpecConfig = SpecConfig,
> {
  document: TDocument;
  level: number;
  config: TConfig;
}

export interface Plugin<
  TDocument extends Document = Document,
  TConfig extends SpecConfig = SpecConfig,
> {
  name: string;
  order?: {
    transform?: number;
  };
  transform?(ctx: PluginTransformContext<TDocument, TConfig>): Promise<void> | void;
}

export type NormativeLevel =
  | 'MUST'
  | 'MUST NOT'
  | 'SHOULD'
  | 'SHOULD NOT'
  | 'MAY'
  | 'NOTE'
  | 'NONE'
  | 'AMBIGUOUS';

export interface ProfilePreprocessOptions<TConfig extends SpecConfig = SpecConfig> {
  entry: string;
  configPath?: string;
  fileProvider: FileProvider;
  env?: Record<string, string | undefined>;
  defaultConfig: TConfig;
}

export interface ProfilePreprocessResult<TConfig extends SpecConfig = SpecConfig> {
  content: string;
  config: TConfig;
  diagnostics?: string[];
}

export interface ProfileParseInput<TConfig extends SpecConfig = SpecConfig> {
  entry: string;
  content: string;
  configPath?: string;
  config: TConfig;
  fileProvider: FileProvider;
  env?: Record<string, string | undefined>;
}

export interface ProfileParseResult<TDocument extends Document = Document> {
  document?: TDocument;
  diagnostics?: string[];
}

export interface ProfileParser<
  TDocument extends Document = Document,
  TConfig extends SpecConfig = SpecConfig,
> {
  name: string;
  parse(input: ProfileParseInput<TConfig>): Promise<ProfileParseResult<TDocument>> | ProfileParseResult<TDocument>;
}

export interface ProfileParserRegistry<
  TDocument extends Document = Document,
  TConfig extends SpecConfig = SpecConfig,
> {
  registerParser(parser: ProfileParser<TDocument, TConfig>): void;
}

export interface ProfilePostprocessDocumentOptions<
  TDocument extends Document = Document,
  TConfig extends SpecConfig = SpecConfig,
> {
  document: TDocument;
  config: TConfig;
  fileProvider: FileProvider;
  env?: Record<string, string | undefined>;
}

export interface ProfilePostprocessDocumentResult<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
> {
  document?: TDocument;
  workspace?: TWorkspace;
  diagnostics?: string[];
}

export interface ProfilePostprocessWorkspaceOptions<
  TWorkspace extends Workspace = Workspace,
  TConfig extends SpecConfig = SpecConfig,
> {
  workspace: TWorkspace;
  configByDocumentId?: Record<string, Partial<TConfig>>;
  fileProvider: FileProvider;
  env?: Record<string, string | undefined>;
}

export interface ProfilePostprocessWorkspaceResult<TWorkspace extends Workspace = Workspace> {
  workspace?: TWorkspace;
  diagnostics?: string[];
}

export interface SpectotalProfile<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
> {
  id: string;
  preprocess?(
    options: ProfilePreprocessOptions<TConfig>,
  ): Promise<ProfilePreprocessResult<TConfig>> | ProfilePreprocessResult<TConfig>;
  parse?(
    input: ProfileParseInput<TConfig>,
  ): Promise<ProfileParseResult<TDocument>> | ProfileParseResult<TDocument>;
  registerParsers?(registry: ProfileParserRegistry<TDocument, TConfig>): void;
  postprocessPlugins?: Plugin<TDocument, TConfig>[];
  postprocessDocument?(
    options: ProfilePostprocessDocumentOptions<TDocument, TConfig>,
  ): Promise<ProfilePostprocessDocumentResult<TDocument, TWorkspace>> | ProfilePostprocessDocumentResult<TDocument, TWorkspace>;
  postprocessWorkspace?(
    options: ProfilePostprocessWorkspaceOptions<TWorkspace, TConfig>,
  ): Promise<ProfilePostprocessWorkspaceResult<TWorkspace>> | ProfilePostprocessWorkspaceResult<TWorkspace>;
  buildIndexBundle?(options: {
    workspace: TWorkspace;
    profileId: string;
    configByDocumentId?: Record<string, Partial<TConfig>>;
    relationGraph?: RelationGraph;
    profileContextByDocumentId?: Record<string, DocumentProfileContext>;
  }): IndexBundle<TWorkspace>;
  buildDocumentContext?(options: {
    document: TWorkspace['documents'][number];
    config: TConfig;
  }): DocumentProfileContext | undefined;
}

export type StructuralDocumentAst<TDocument extends Document = Document> = Omit<TDocument, 'indexes' | 'computed' | 'profileContext'>;

export type StructuralWorkspaceAst<TWorkspace extends Workspace = Workspace> = Omit<TWorkspace, 'documents' | 'globalIndex'> & {
  documents: Array<StructuralDocumentAst<TWorkspace['documents'][number]>>;
};

export interface IndexBundleDocument<TDocument extends Document = Document> {
  documentId: string;
  sourceFile?: string;
  indexes?: TDocument['indexes'];
  computed?: TDocument['computed'];
  profileContext?: DocumentProfileContext;
}

export interface IndexBundle<TWorkspace extends Workspace = Workspace> {
  schemaVersion: '1.0.0';
  profileId: string;
  relationGraph?: RelationGraph;
  globalIndex?: TWorkspace['globalIndex'];
  documents: Array<IndexBundleDocument<TWorkspace['documents'][number]>>;
}

export interface RunSpecOptions<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
> {
  entry: string;
  configPath?: string;
  fileProvider?: FileProvider;
  env?: Record<string, string | undefined>;
  profile: SpectotalProfile<TDocument, TWorkspace, TConfig>;
  defaultConfig?: Partial<TConfig>;
}

export interface WorkspaceSpecEntry<TConfig extends SpecConfig = SpecConfig> {
  entry: string;
  configPath?: string;
  defaultConfig?: Partial<TConfig>;
}

export interface RunWorkspaceSpecOptions<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
> {
  entries: WorkspaceSpecEntry<TConfig>[];
  fileProvider?: FileProvider;
  env?: Record<string, string | undefined>;
  profile: SpectotalProfile<TDocument, TWorkspace, TConfig>;
}

export interface PostprocessDocumentWithProfileOptions<
  TDocument extends Document = Document,
  TWorkspace extends Workspace<TDocument> = Workspace<TDocument>,
  TConfig extends SpecConfig = SpecConfig,
> {
  document: TDocument;
  profile: SpectotalProfile<TDocument, TWorkspace, TConfig>;
  config?: Partial<TConfig>;
  fileProvider?: FileProvider;
  env?: Record<string, string | undefined>;
}

export interface PostprocessWorkspaceWithProfileOptions<
  TWorkspace extends Workspace = Workspace,
  TConfig extends SpecConfig = SpecConfig,
> {
  workspace: TWorkspace | StructuralWorkspaceAst<TWorkspace>;
  profile: SpectotalProfile<TWorkspace['documents'][number], TWorkspace, TConfig>;
  configByDocumentId?: Record<string, Partial<TConfig>>;
  fileProvider?: FileProvider;
  env?: Record<string, string | undefined>;
}

export interface SpectotalRunResult<TWorkspace extends Workspace = Workspace> {
  workspaceAst?: StructuralWorkspaceAst<TWorkspace>;
  indexBundle?: IndexBundle<TWorkspace>;
  diagnostics: string[];
  profileId: string;
}

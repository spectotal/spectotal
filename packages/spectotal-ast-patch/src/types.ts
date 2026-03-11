import type {
  Document,
  SourcePos,
  ValidationMode,
  Workspace,
} from '@spectotal/core';

export type AstRoot = Document | Workspace;

export type AstNode = {
  type: string;
  sourcePos?: SourcePos;
  [key: string]: unknown;
};

export interface PatchContext {
  root: AstRoot;
  node: AstNode;
  parent: AstNode | null;
  parentKey?: string;
  parentIndex?: number;
  pathSegments: Array<string | number>;
  path: string;
  ancestors: AstNode[];
  documentId?: string;
}

export type PatchSelector = (node: AstNode, ctx: PatchContext) => boolean;
export type NodeFactory = (target: AstNode, ctx: PatchContext) => AstNode;
export type NodesFactory = (target: AstNode, ctx: PatchContext) => AstNode | AstNode[];

interface PatchOperationBase {
  match: PatchSelector;
  description?: string;
}

export interface WrapPatchOperation extends PatchOperationBase {
  op: 'wrap';
  createWrapper: NodeFactory;
}

export interface AppendPatchOperation extends PatchOperationBase {
  op: 'append';
  nodes: AstNode | AstNode[] | NodesFactory;
}

export interface PrependPatchOperation extends PatchOperationBase {
  op: 'prepend';
  nodes: AstNode | AstNode[] | NodesFactory;
}

export interface ReplacePatchOperation extends PatchOperationBase {
  op: 'replace';
  replacement: AstNode | NodeFactory;
}

export interface RemovePatchOperation extends PatchOperationBase {
  op: 'remove';
}

export type PatchOperation =
  | WrapPatchOperation
  | AppendPatchOperation
  | PrependPatchOperation
  | ReplacePatchOperation
  | RemovePatchOperation;

export type PatchErrorCode =
  | 'NO_MATCH'
  | 'MULTIPLE_MATCHES'
  | 'INVALID_TARGET'
  | 'INVALID_ROOT_OPERATION'
  | 'OPERATION_FAILED'
  | 'VALIDATION_FAILED'
  | 'POSTPROCESS_FAILED';

export interface PatchError {
  code: PatchErrorCode;
  message: string;
  operation?: PatchOperation['op'];
  operationIndex?: number;
  path?: string;
  details?: unknown;
}

export interface ValidationAdapterResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

export interface AstValidationAdapter {
  validate(ast: AstRoot, mode?: ValidationMode): ValidationAdapterResult;
}

export interface PatchApplyOptions {
  errorMode?: 'stop-first' | 'collect-all';
  validate?: boolean;
  validationMode?: ValidationMode;
  validator?: AstValidationAdapter;
}

export interface PatchResult<T extends AstRoot> {
  ok: boolean;
  ast: T;
  errors: PatchError[];
  appliedCount: number;
}

export interface PatchPostprocessAdapter {
  postprocessDocument(options: {
    document: Document;
    config?: Record<string, unknown>;
  }): Promise<{
    document: Document;
    errors?: string[];
    metadata?: Record<string, unknown>;
  }>;

  postprocessWorkspace(options: {
    workspace: Workspace;
    configByDocumentId?: Record<string, Record<string, unknown>>;
  }): Promise<{
    workspace: Workspace;
    errors?: string[];
    metadata?: Record<string, unknown>;
  }>;
}

export interface PatchAndPostprocessDocumentOptions {
  document: Document;
  operations: PatchOperation[];
  patchOptions?: PatchApplyOptions;
  config?: Record<string, unknown>;
  postprocess: PatchPostprocessAdapter;
}

export interface PatchAndPostprocessWorkspaceOptions {
  workspace: Workspace;
  operations: PatchOperation[];
  patchOptions?: PatchApplyOptions;
  configByDocumentId?: Record<string, Record<string, unknown>>;
  postprocess: PatchPostprocessAdapter;
}

export interface PatchAndPostprocessResult<T extends AstRoot> {
  ok: boolean;
  ast: T;
  errors: PatchError[];
  patch: PatchResult<T>;
  postprocess?: {
    errors?: string[];
    metadata?: Record<string, unknown>;
  };
}

export interface SyntheticSourcePosRecalcOptions {
  order?: number;
  fileForDocument?: (document: Document, level: number) => string;
}

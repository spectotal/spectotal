export type NodeId = string;
export type AstPath = readonly (string | number)[];

export type Provenance =
  | { kind: "source"; uri: string; line?: number; column?: number }
  | { kind: "patch"; patchId: string; plugin?: string; basedOn?: NodeId[] }
  | { kind: "synthetic"; reason: string };

export interface AstNode {
  readonly kind: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly slots?: Readonly<Record<string, readonly AstNode[]>>;
}

export interface CanonicalDocumentAst {
  readonly root: AstNode;
  readonly profileId: string;
  readonly version: string;
}

export interface CompilePlan {
  readonly profileId: string;
  readonly options?: Readonly<Record<string, unknown>>;
  readonly featureFlags?: Readonly<Record<string, boolean>>;
  readonly inputs?: readonly string[];
}

export interface DraftDocumentAst {
  readonly root: AstNode;
  readonly profileId: string;
}

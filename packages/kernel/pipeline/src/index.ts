import type { CanonicalDocumentAst, CompilePlan } from "@spectotal/ast";
import type { AstPatch } from "@spectotal/ast-patch";
import type { DerivationBundle } from "@spectotal/derivations";
import type { SpectotalProfile } from "@spectotal/profile-core";
import type { ComposedSource } from "@spectotal/source-compose";
import type { DocumentId, WorkspaceGraph, WorkspacePlan } from "@spectotal/workspace-graph";

export interface ParseContext {
  readonly plan: CompilePlan;
  readonly profile: SpectotalProfile;
  readonly source: ComposedSource;
  readonly documentId: DocumentId;
  readonly workspace?: WorkspaceGraph;
}

export interface TransformPlugin {
  readonly name: string;
  run(ast: CanonicalDocumentAst, plan: CompilePlan, workspace?: WorkspaceGraph): Promise<readonly AstPatch[]>;
}

export interface DerivePlugin<T = unknown> {
  readonly name: string;
  readonly artifactKey: string;
  run(ast: CanonicalDocumentAst, plan: CompilePlan, workspace?: WorkspaceGraph): Promise<T>;
}

export interface DocumentPipelineResult {
  readonly documentId: DocumentId;
  readonly ast: CanonicalDocumentAst;
  readonly derivations: DerivationBundle;
}

export interface WorkspacePipelineResult {
  readonly workspacePlan: WorkspacePlan;
  readonly workspaceGraph: WorkspaceGraph;
  readonly documents: readonly DocumentPipelineResult[];
}

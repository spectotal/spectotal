import type { AstNode, CanonicalDocumentAst } from "@spectotal/ast";
import type { ProfileSchema } from "@spectotal/ast-schema";

export type PatchTarget =
  | { readonly by: "path"; readonly path: readonly (string | number)[] }
  | { readonly by: "nodeId"; readonly nodeId: string };

export type AstPatch =
  | { readonly op: "append"; readonly target: PatchTarget; readonly slot: string; readonly nodes: readonly AstNode[] }
  | { readonly op: "prepend"; readonly target: PatchTarget; readonly slot: string; readonly nodes: readonly AstNode[] }
  | { readonly op: "insertBefore"; readonly target: PatchTarget; readonly nodes: readonly AstNode[] }
  | { readonly op: "insertAfter"; readonly target: PatchTarget; readonly nodes: readonly AstNode[] }
  | { readonly op: "replace"; readonly target: PatchTarget; readonly nodes: readonly AstNode[] }
  | { readonly op: "remove"; readonly target: PatchTarget }
  | { readonly op: "wrap"; readonly target: PatchTarget; readonly wrapper: AstNode; readonly childSlot: string };

export interface PatchDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly patchIndex: number;
}

export interface PatchApplyResult {
  readonly ast: CanonicalDocumentAst;
  readonly diagnostics: readonly PatchDiagnostic[];
  readonly changed: boolean;
  readonly invalidatesDerivations: boolean;
}

export function applyPatches(ast: CanonicalDocumentAst, _schema: ProfileSchema, _patches: readonly AstPatch[]): PatchApplyResult {
  return { ast, diagnostics: [], changed: false, invalidatesDerivations: false };
}

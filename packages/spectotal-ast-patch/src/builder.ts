import type { Document, Workspace } from '@spectotal/core';
import { applyDocumentPatches, applyWorkspacePatches } from './engine.js';
import type {
  PatchApplyOptions,
  PatchOperation,
  PatchResult,
  WrapPatchOperation,
  AppendPatchOperation,
  PrependPatchOperation,
  ReplacePatchOperation,
  RemovePatchOperation,
} from './types.js';

export class PatchBuilder<T extends Document | Workspace> {
  private readonly operations: PatchOperation[] = [];

  constructor(
    private readonly root: T,
    private readonly applyFn: (
      root: T,
      operations: PatchOperation[],
      options: PatchApplyOptions,
    ) => PatchResult<T>,
    private readonly defaultOptions: PatchApplyOptions = {},
  ) {}

  wrap(operation: Omit<WrapPatchOperation, 'op'>): this {
    this.operations.push({ op: 'wrap', ...operation });
    return this;
  }

  append(operation: Omit<AppendPatchOperation, 'op'>): this {
    this.operations.push({ op: 'append', ...operation });
    return this;
  }

  prepend(operation: Omit<PrependPatchOperation, 'op'>): this {
    this.operations.push({ op: 'prepend', ...operation });
    return this;
  }

  replace(operation: Omit<ReplacePatchOperation, 'op'>): this {
    this.operations.push({ op: 'replace', ...operation });
    return this;
  }

  remove(operation: Omit<RemovePatchOperation, 'op'>): this {
    this.operations.push({ op: 'remove', ...operation });
    return this;
  }

  getOperations(): PatchOperation[] {
    return [...this.operations];
  }

  apply(options: PatchApplyOptions = {}): PatchResult<T> {
    const mergedOptions: PatchApplyOptions = {
      ...this.defaultOptions,
      ...options,
    };

    return this.applyFn(this.root, this.operations, mergedOptions);
  }
}

export function patchDocument(document: Document, options: PatchApplyOptions = {}): PatchBuilder<Document> {
  return new PatchBuilder(document, applyDocumentPatches, options);
}

export function patchWorkspace(workspace: Workspace, options: PatchApplyOptions = {}): PatchBuilder<Workspace> {
  return new PatchBuilder(workspace, applyWorkspacePatches, options);
}

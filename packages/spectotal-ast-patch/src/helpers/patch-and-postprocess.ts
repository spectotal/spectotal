import type {
  Document,
  Workspace,
} from '@spectotal/core';
import { applyDocumentPatches, applyWorkspacePatches } from '../engine.js';
import type {
  PatchAndPostprocessDocumentOptions,
  PatchAndPostprocessResult,
  PatchAndPostprocessWorkspaceOptions,
  PatchError,
} from '../types.js';

function asPostprocessErrors(errors: string[] | undefined): PatchError[] {
  return (errors ?? []).map((message) => ({
    code: 'POSTPROCESS_FAILED',
    message,
  }));
}

export async function patchAndPostprocessDocument(
  options: PatchAndPostprocessDocumentOptions,
): Promise<PatchAndPostprocessResult<Document>> {
  const patch = applyDocumentPatches(options.document, options.operations, options.patchOptions);
  if (!patch.ok) {
    return {
      ok: false,
      ast: patch.ast,
      errors: patch.errors,
      patch,
    };
  }

  const postprocessResult = await options.postprocess.postprocessDocument({
    document: patch.ast,
    config: options.config,
  });

  const postprocessErrors = asPostprocessErrors(postprocessResult.errors);
  return {
    ok: postprocessErrors.length === 0,
    ast: postprocessResult.document ?? patch.ast,
    errors: [...patch.errors, ...postprocessErrors],
    patch,
    postprocess: {
      errors: postprocessResult.errors,
      metadata: postprocessResult.metadata,
    },
  };
}

export async function patchAndPostprocessWorkspace(
  options: PatchAndPostprocessWorkspaceOptions,
): Promise<PatchAndPostprocessResult<Workspace>> {
  const patch = applyWorkspacePatches(options.workspace, options.operations, options.patchOptions);
  if (!patch.ok) {
    return {
      ok: false,
      ast: patch.ast,
      errors: patch.errors,
      patch,
    };
  }

  const postprocessResult = await options.postprocess.postprocessWorkspace({
    workspace: patch.ast,
    configByDocumentId: options.configByDocumentId,
  });

  const postprocessErrors = asPostprocessErrors(postprocessResult.errors);
  return {
    ok: postprocessErrors.length === 0,
    ast: postprocessResult.workspace ?? patch.ast,
    errors: [...patch.errors, ...postprocessErrors],
    patch,
    postprocess: {
      errors: postprocessResult.errors,
      metadata: postprocessResult.metadata,
    },
  };
}

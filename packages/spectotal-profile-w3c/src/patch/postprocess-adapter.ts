import {
  hydrateWorkspaceFromIndexBundle,
  postprocessDocumentWithProfile,
  postprocessWorkspaceWithProfile,
  type SpecConfig,
} from '@spectotal/core';
import type { PatchPostprocessAdapter } from '@spectotal/ast-patch';
import { w3cProfile } from '../profile.js';

export function createW3cPostprocessAdapter(): PatchPostprocessAdapter {
  return {
    async postprocessDocument(options) {
      const result = await postprocessDocumentWithProfile({
        document: options.document,
        profile: w3cProfile,
        config: options.config as Partial<SpecConfig> | undefined,
      });

      if (!result.workspaceAst || !result.indexBundle) {
        return {
          document: options.document,
          errors: result.diagnostics,
          metadata: { profileId: result.profileId },
        };
      }

      const workspace = hydrateWorkspaceFromIndexBundle(result.workspaceAst, result.indexBundle);
      return {
        document: workspace.documents[0] ?? options.document,
        errors: result.diagnostics,
        metadata: { profileId: result.profileId },
      };
    },

    async postprocessWorkspace(options) {
      const result = await postprocessWorkspaceWithProfile({
        workspace: options.workspace,
        profile: w3cProfile,
        configByDocumentId: options.configByDocumentId as Record<string, Partial<SpecConfig>> | undefined,
      });

      if (!result.workspaceAst || !result.indexBundle) {
        return {
          workspace: options.workspace,
          errors: result.diagnostics,
          metadata: { profileId: result.profileId },
        };
      }

      const workspace = hydrateWorkspaceFromIndexBundle(result.workspaceAst, result.indexBundle);
      return {
        workspace,
        errors: result.diagnostics,
        metadata: { profileId: result.profileId },
      };
    },
  };
}

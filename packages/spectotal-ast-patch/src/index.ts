export * from './types.js';

export { applyDocumentPatches, applyWorkspacePatches } from './engine.js';
export { PatchBuilder, patchDocument, patchWorkspace } from './builder.js';

export {
  patchAndPostprocessDocument,
  patchAndPostprocessWorkspace,
} from './helpers/patch-and-postprocess.js';

export {
  recalculateDocumentSourcePos,
  createSyntheticSourcePosRecalcPlugin,
} from './plugins/synthetic-source-pos-recalc.js';

export { walkAstNodes } from './walk.js';

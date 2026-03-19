// Generated file. Do not edit directly.
// Regenerate with the profile schema generation script.

import { createProfileSchemaValidators, type ProfileSchemaValidators } from "@spectotal/ast-schema";
import { w3cNodeSchemas, w3cProfileId, w3cRootKind } from "./w3c.metadata.generated.js";

export const w3cValidators: ProfileSchemaValidators = createProfileSchemaValidators({
  profileId: w3cProfileId,
  rootKind: w3cRootKind,
  nodes: w3cNodeSchemas,
});

export const validateW3cNode = w3cValidators.node;
export const validateW3cRoot = w3cValidators.root;
export const validateW3cDocument = w3cValidators.document;

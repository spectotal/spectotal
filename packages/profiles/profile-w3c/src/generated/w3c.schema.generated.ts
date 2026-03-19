// Generated file. Do not edit directly.
// Regenerate with the profile schema generation script.

import type { ProfileSchema } from "@spectotal/ast-schema";
import { w3cNodeSchemas, w3cProfileId, w3cRootKind } from "./w3c.metadata.generated.js";
import { w3cPatchRulesByKind } from "./w3c.rules.generated.js";
import { w3cValidators } from "./w3c.validators.generated.js";

export const w3cSchema: ProfileSchema = {
  profileId: w3cProfileId,
  rootKind: w3cRootKind,
  nodes: w3cNodeSchemas,
  patchRulesByKind: w3cPatchRulesByKind,
  validators: w3cValidators,
};

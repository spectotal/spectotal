import {
  createProfileSchema,
  defineProfileSchemaSource,
} from "@spectotal/ast-schema";
import type { SpectotalProfile } from "@spectotal/profile-core";

export const gherkinSchema = createProfileSchema(
  defineProfileSchemaSource({
    profileId: "gherkin",
    rootKind: "feature",
    nodes: {
      feature: { children: { accepts: ["background", "scenario"] } },
      background: { children: { accepts: ["step"] } },
      scenario: { children: { accepts: ["step", "examplesTable"] } },
      step: {},
      examplesTable: {},
    },
  }),
);

export const GHERKIN_PROFILE: SpectotalProfile = {
  id: "gherkin",
  schema: gherkinSchema,
};

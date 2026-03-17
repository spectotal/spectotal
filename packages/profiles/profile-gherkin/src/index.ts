import type { ProfileSchema } from "@spectotal/ast-schema";
import type { SpectotalProfile } from "@spectotal/profile-core";

export const gherkinSchema: ProfileSchema = {
  profileId: "gherkin",
  nodes: [
    { kind: "feature", slots: [{ name: "children", accepts: ["background", "scenario"] }] },
    { kind: "background", slots: [{ name: "steps", accepts: ["step"] }] },
    { kind: "scenario", slots: [{ name: "steps", accepts: ["step"] }, { name: "examples", accepts: ["examplesTable"] }] },
    { kind: "step" },
    { kind: "examplesTable" }
  ]
};

export const GHERKIN_PROFILE: SpectotalProfile = {
  id: "gherkin",
  schema: gherkinSchema,
};

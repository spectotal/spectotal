import type { ProfileSchema } from "@spectotal/ast-schema";
import type { SpectotalProfile } from "@spectotal/profile-core";

export const gherkinSchema: ProfileSchema = {
  profileId: "gherkin",
  rootKind: "feature",
  nodes: {
    feature: { kind: "feature", children: { accepts: ["background", "scenario"] } },
    background:  { kind: "background", children: { accepts: ["step"] } },
    scenario:  { kind: "scenario", children: { accepts: ["step", "examplesTable"] } },
    step:  { kind: "step" },
    examplesTable:{ kind: "examplesTable" }
  }
};

export const GHERKIN_PROFILE: SpectotalProfile = {
  id: "gherkin",
  schema: gherkinSchema,
};
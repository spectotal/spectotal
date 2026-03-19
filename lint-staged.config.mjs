import { createRootLintStagedConfig } from "./tools/lint-staged/shared.mjs";

export default createRootLintStagedConfig({
  checks: ["typecheck", "test"],
});

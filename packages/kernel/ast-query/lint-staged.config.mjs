import { createWorkspaceLintStagedConfig } from "../../../tools/lint-staged/shared.mjs";

export default createWorkspaceLintStagedConfig({
  configUrl: import.meta.url,
  checks: ["typecheck"],
});

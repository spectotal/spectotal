import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/coverage/**",
      "**/dist/**",
      "**/dist-scenarios/**",
      "**/node_modules/**",
      "apps/playground/fixtures/**",
      "packages/profiles/profile-w3c/src/generated/**",
      "packages/tooling/test-kit/fixtures/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "no-undef": "off",
    },
  },
);

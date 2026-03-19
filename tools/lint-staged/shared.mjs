import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { getFileInfo } from "prettier";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const prettierIgnorePath = resolve(repoRoot, ".prettierignore");
const eslint = new ESLint();

const eslintExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
]);

function quoteForShell(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function toExtension(path) {
  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.slice(lastDot);
}

function runScriptCommand(script) {
  return `pnpm run ${script}`;
}

async function getEslintFiles(stagedFiles) {
  const candidates = stagedFiles.filter(({ absolute: path }) =>
    eslintExtensions.has(toExtension(path)),
  );

  const ignored = await Promise.all(
    candidates.map(({ absolute }) => eslint.isPathIgnored(absolute)),
  );

  return candidates
    .filter((_, index) => !ignored[index])
    .map(({ absolute: path }) => path);
}

async function getPrettierFiles(stagedFiles) {
  const fileInfo = await Promise.all(
    stagedFiles.map(({ absolute }) =>
      getFileInfo(absolute, {
        ignorePath: prettierIgnorePath,
        resolveConfig: false,
      }),
    ),
  );

  return stagedFiles
    .filter((_, index) => {
      const info = fileInfo[index];
      return !info.ignored && info.inferredParser;
    })
    .map(({ absolute: path }) => path);
}

async function buildCommands(allStagedFiles, { checks }) {
  const stagedFiles = allStagedFiles
    .map((absolute) => ({ absolute }))
    .filter(({ absolute: path }) => path);

  const eslintFiles = await getEslintFiles(stagedFiles);
  const prettierFiles = await getPrettierFiles(stagedFiles);
  const commands = [];

  if (eslintFiles.length > 0) {
    commands.push(
      `eslint --fix --max-warnings=0 -- ${eslintFiles.map(quoteForShell).join(" ")}`,
    );
  }

  if (prettierFiles.length > 0) {
    commands.push(
      `prettier --write -- ${prettierFiles.map(quoteForShell).join(" ")}`,
    );
  }

  for (const check of checks) {
    commands.push(runScriptCommand(check));
  }

  return commands;
}

export function createRootLintStagedConfig({ checks = [] } = {}) {
  return (allStagedFiles) => buildCommands(allStagedFiles, { checks });
}

export function createWorkspaceLintStagedConfig(options = {}) {
  return (allStagedFiles) =>
    buildCommands(allStagedFiles, {
      checks: options.checks ?? ["typecheck"],
    });
}

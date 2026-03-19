import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderProfileArtifacts } from "../../../kernel/ast-schema/src/index.js";
import { w3cSchemaSource } from "../src/schema/w3c.schema-source.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const generatedDir = resolve(scriptDir, "../src/generated");
const checkMode = process.argv.includes("--check");

interface OutputFile {
  readonly path: string;
  readonly content: string;
}

async function readExistingFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function main(): Promise<void> {
  const artifacts = renderProfileArtifacts({
    source: w3cSchemaSource,
    baseName: "w3c",
    typePrefix: "W3c",
  });

  const files: readonly OutputFile[] = [
    {
      path: resolve(generatedDir, "w3c.metadata.generated.ts"),
      content: artifacts.metadata,
    },
    {
      path: resolve(generatedDir, "w3c.rules.generated.ts"),
      content: artifacts.rules,
    },
    {
      path: resolve(generatedDir, "w3c.validators.generated.ts"),
      content: artifacts.validators,
    },
    {
      path: resolve(generatedDir, "w3c.schema.generated.ts"),
      content: artifacts.schema,
    },
    {
      path: resolve(generatedDir, "w3c.types.generated.ts"),
      content: artifacts.types,
    },
  ];

  await mkdir(generatedDir, { recursive: true });

  const staleFiles: string[] = [];

  for (const file of files) {
    const existing = await readExistingFile(file.path);

    if (checkMode) {
      if (existing !== file.content) staleFiles.push(file.path);
      continue;
    }

    if (existing !== file.content) {
      await writeFile(file.path, file.content, "utf8");
    }
  }

  if (checkMode && staleFiles.length > 0) {
    throw new Error(
      `Generated schema artifacts are stale:\n${staleFiles.map((path) => `- ${path}`).join("\n")}\nRun: pnpm run schema:generate`,
    );
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

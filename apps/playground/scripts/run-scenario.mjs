import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const playgroundRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(playgroundRoot, "scenarios");
const outputRoot = join(playgroundRoot, "dist-scenarios");
const snapshotRoot = join(playgroundRoot, ".snapshots-local");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts")) files.push(fullPath);
  }

  return files.sort();
}

async function listScenarios() {
  const files = await walk(sourceRoot);
  if (files.length === 0) {
    console.log("No scenario files found under scenarios/.");
    return;
  }

  for (const file of files) {
    console.log(relative(playgroundRoot, file));
  }
}

function getScenarioArgument() {
  const [, , ...args] = process.argv;
  const filtered = args.filter((arg) => arg !== "--");
  return filtered[0];
}

function toCompiledPath(sourcePath) {
  const relativeSourcePath = relative(playgroundRoot, sourcePath);
  const extension = extname(relativeSourcePath);
  return join(outputRoot, relativeSourcePath.slice(0, -extension.length) + ".js");
}

function toSnapshotPath(sourcePath) {
  const relativeSourcePath = relative(sourceRoot, sourcePath);
  const extension = extname(relativeSourcePath);
  return join(snapshotRoot, relativeSourcePath.slice(0, -extension.length) + ".json");
}

async function loadScenario(sourcePath) {
  const relativeScenarioPath = relative(sourceRoot, sourcePath);
  if (relativeScenarioPath.startsWith("..")) {
    throw new Error(`Scenario path must be inside scenarios/: ${relative(playgroundRoot, sourcePath)}`);
  }

  const compiledPath = toCompiledPath(sourcePath);
  const module = await import(pathToFileURL(compiledPath).href);
  const runner = typeof module.default === "function" ? module.default : module.run;

  if (typeof runner !== "function") {
    throw new Error(`Scenario ${relative(playgroundRoot, sourcePath)} must export a default function or named run function.`);
  }

  return runner;
}

async function writeSnapshot(sourcePath, result) {
  const snapshotPath = toSnapshotPath(sourcePath);
  await mkdir(dirname(snapshotPath), { recursive: true });
  const payload = `${JSON.stringify(result, null, 2)}\n`;
  await writeFile(snapshotPath, payload, "utf8");
  return { snapshotPath, payload };
}

async function main() {
  const scenarioArg = getScenarioArgument();

  if (!scenarioArg || scenarioArg === "--list") {
    await listScenarios();
    return;
  }

  const sourcePath = resolve(playgroundRoot, scenarioArg);
  const runner = await loadScenario(sourcePath);
  const result = await runner();
  const { snapshotPath, payload } = await writeSnapshot(sourcePath, result);

  process.stdout.write(payload);
  console.log(`Snapshot: ${relative(playgroundRoot, snapshotPath)}`);
}

void main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);

  try {
    const requested = getScenarioArgument();
    if (requested && requested !== "--list") {
      const resolved = resolve(playgroundRoot, requested);
      const compiledPath = toCompiledPath(resolved);
      const compiledOutput = await readFile(compiledPath, "utf8");
      console.error(`Compiled file exists at ${relative(playgroundRoot, compiledPath)} (${compiledOutput.length} bytes).`);
    }
  } catch {}

  process.exitCode = 1;
});

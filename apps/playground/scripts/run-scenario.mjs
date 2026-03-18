import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

function getCliOptions() {
  const [, , ...args] = process.argv;
  const filtered = args.filter((arg) => arg !== "--");

  let scenarioArg;
  let listRequested = false;
  let sourceMode = false;

  for (const arg of filtered) {
    if (arg === "--list") {
      listRequested = true;
      continue;
    }

    if (arg === "--source") {
      sourceMode = true;
      continue;
    }

    if (!scenarioArg) {
      scenarioArg = arg;
    }
  }

  return { listRequested, scenarioArg, sourceMode };
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

  const { sourceMode } = getCliOptions();
  const runtimePath = sourceMode ? sourcePath : toCompiledPath(sourcePath);
  const module = await import(pathToFileURL(runtimePath).href);
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

async function resolveScenarioPath(scenarioArg) {
  const requestedPath = resolve(playgroundRoot, scenarioArg);
  const extension = extname(requestedPath);
  const candidates = extension ? [requestedPath] : [requestedPath, `${requestedPath}.ts`];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }

  return requestedPath;
}

async function main() {
  const { listRequested, scenarioArg } = getCliOptions();

  if (!scenarioArg || listRequested) {
    await listScenarios();
    return;
  }

  const sourcePath = await resolveScenarioPath(scenarioArg);
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
    const { scenarioArg, sourceMode } = getCliOptions();
    if (scenarioArg && !sourceMode) {
      const resolved = await resolveScenarioPath(scenarioArg);
      const compiledPath = toCompiledPath(resolved);
      const compiledOutput = await readFile(compiledPath, "utf8");
      console.error(`Compiled file exists at ${relative(playgroundRoot, compiledPath)} (${compiledOutput.length} bytes).`);
    }
  } catch {}

  process.exitCode = 1;
});

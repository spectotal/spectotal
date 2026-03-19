import { existsSync } from "node:fs";
import { access, readFile, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const playgroundRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(playgroundRoot, "../..");
const workspaceRoots = [join(repoRoot, "packages"), join(repoRoot, "apps")];

function isRelativeOrAbsolutePath(specifier) {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/")
  );
}

function resolveLocalTypeScriptPath(specifier, parentURL) {
  if (
    !parentURL ||
    !specifier.endsWith(".js") ||
    !isRelativeOrAbsolutePath(specifier)
  ) {
    return null;
  }

  const jsPath = specifier.startsWith("/")
    ? specifier
    : fileURLToPath(new URL(specifier, parentURL));
  const tsPath = `${jsPath.slice(0, -3)}.ts`;

  if (!existsSync(jsPath) && existsSync(tsPath)) {
    return tsPath;
  }

  return null;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function discoverWorkspacePackages(root, depth = 0) {
  const entries = await readdir(root, { withFileTypes: true });
  const packageRoots = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const entryPath = join(root, entry.name);
    const manifestPath = join(entryPath, "package.json");
    const sourceEntryPath = join(entryPath, "src", "index.ts");
    const hasManifest = await pathExists(manifestPath);

    if (hasManifest) {
      if (await pathExists(sourceEntryPath)) {
        packageRoots.push(entryPath);
      }
      continue;
    }

    if (depth < 3) {
      packageRoots.push(
        ...(await discoverWorkspacePackages(entryPath, depth + 1)),
      );
    }
  }

  return packageRoots;
}

async function createPackageMap() {
  const packageMap = new Map();

  for (const workspaceRoot of workspaceRoots) {
    if (!(await pathExists(workspaceRoot))) continue;

    const packageRoots = await discoverWorkspacePackages(workspaceRoot);

    for (const packageRoot of packageRoots) {
      const manifest = JSON.parse(
        await readFile(join(packageRoot, "package.json"), "utf8"),
      );
      if (typeof manifest.name !== "string") continue;
      packageMap.set(manifest.name, join(packageRoot, "src", "index.ts"));
    }
  }

  return packageMap;
}

const packageMap = await createPackageMap();

registerHooks({
  resolve(specifier, context, nextResolve) {
    const sourceEntryPath = packageMap.get(specifier);

    if (sourceEntryPath) {
      return {
        shortCircuit: true,
        url: pathToFileURL(sourceEntryPath).href,
      };
    }

    const redirectedPath = resolveLocalTypeScriptPath(
      specifier,
      context.parentURL,
    );

    if (redirectedPath) {
      return {
        shortCircuit: true,
        url: pathToFileURL(redirectedPath).href,
      };
    }

    return nextResolve(specifier, context);
  },
});

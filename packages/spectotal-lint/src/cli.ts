#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  IndexBundle,
  StructuralWorkspaceAst,
} from '@spectotal/core';
import { defaultConfig, loadConfig, loadConfigFromDefaults } from './config.js';
import { SpectotalLinter } from './linter.js';
import type { LintConfig, LintDiagnostic, LintRule } from './types.js';

interface CliArgs {
  workspacePath?: string;
  indexBundlePath?: string;
  profileModulePath?: string;
  configPath?: string;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--workspace' || arg === '-w') {
      result.workspacePath = args[++index];
      continue;
    }

    if (arg === '--index-bundle' || arg === '-i') {
      result.indexBundlePath = args[++index];
      continue;
    }

    if (arg === '--profile-module' || arg === '-p') {
      result.profileModulePath = args[++index];
      continue;
    }

    if (arg === '--config' || arg === '-c') {
      result.configPath = args[++index];
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
spectotal-lint - Engine-only lint runner for Spectotal

Usage:
  spectotal-lint --workspace <workspace.json> --index-bundle <bundle.json> --profile-module <module> [options]

Options:
  --workspace, -w <path>       Path to structural workspace AST JSON
  --index-bundle, -i <path>    Path to IndexBundle JSON
  --profile-module, -p <path>  Path to module exporting lint rules for a profile
  --config, -c <path>          Path to linter configuration file
  --help, -h                   Show this help message

Profile module exports:
  - lintRules: LintRule[] (required)
  - recommendedLintConfig?: LintConfig (optional)
`);
}

function formatDiagnostic(diagnostic: LintDiagnostic): string {
  const severity = diagnostic.severity.toUpperCase();
  const code = diagnostic.code;
  const file = diagnostic.file;
  const line = diagnostic.sourcePos?.line || '?';
  const col = diagnostic.sourcePos?.column || '?';
  return `${severity} [${code}] ${file}:${line}:${col}\n  ${diagnostic.message}`;
}

function readJson<T>(path: string): T {
  const resolved = resolve(path);
  const content = readFileSync(resolved, 'utf-8');
  return JSON.parse(content) as T;
}

function resolveRulesExport(moduleExports: Record<string, unknown>): LintRule[] {
  const candidates = [
    moduleExports.lintRules,
    moduleExports.w3cLintRules,
    moduleExports.default,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as LintRule[];
    }
  }

  throw new Error(
    'Profile module must export a lint rule array as "lintRules", "w3cLintRules", or default export.',
  );
}

function resolveRecommendedConfig(moduleExports: Record<string, unknown>): LintConfig | undefined {
  const candidates = [
    moduleExports.recommendedLintConfig,
    moduleExports.w3cRecommendedLintConfig,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    if ('rules' in (candidate as Record<string, unknown>)) {
      return candidate as LintConfig;
    }
  }

  return undefined;
}

async function loadProfileModule(modulePath: string): Promise<{
  lintRules: LintRule[];
  recommendedLintConfig?: LintConfig;
}> {
  const absolutePath = resolve(modulePath);
  const url = pathToFileURL(absolutePath).href;
  const mod = await import(url);
  const moduleExports = mod as Record<string, unknown>;

  return {
    lintRules: resolveRulesExport(moduleExports),
    recommendedLintConfig: resolveRecommendedConfig(moduleExports),
  };
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.workspacePath || !args.indexBundlePath || !args.profileModulePath) {
    showHelp();
    process.exit(1);
  }

  try {
    const workspaceAst = readJson<StructuralWorkspaceAst>(args.workspacePath);
    const indexBundle = readJson<IndexBundle>(args.indexBundlePath);
    const profileModule = await loadProfileModule(args.profileModulePath);

    let config: LintConfig;
    if (args.configPath) {
      config = loadConfig(args.configPath);
      console.log(`Using linter config from: ${args.configPath}`);
    } else {
      const loadedConfig = loadConfigFromDefaults();
      if (loadedConfig) {
        config = loadedConfig;
        console.log('Using linter config from default location');
      } else if (profileModule.recommendedLintConfig) {
        config = profileModule.recommendedLintConfig;
        console.log('Using recommended profile config from profile module');
      } else {
        config = defaultConfig;
        console.log('Using empty default linter config');
      }
    }

    const linter = new SpectotalLinter(profileModule.lintRules);
    const result = await linter.lint({
      workspaceAst,
      indexBundle,
      config,
    });

    if (result.diagnostics.length === 0) {
      console.log('No issues found');
    } else {
      for (const diagnostic of result.diagnostics) {
        console.log(formatDiagnostic(diagnostic));
        console.log('');
      }

      const errorCount = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
      const warningCount = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
      console.log(`Found ${errorCount} error(s), ${warningCount} warning(s)`);
    }

    console.log(`Completed in ${result.totalTime.toFixed(2)}ms`);
    process.exit(result.hasErrors ? 1 : 0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

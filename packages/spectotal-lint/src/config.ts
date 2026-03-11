import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LintConfig, RuleConfigValue } from './types.js';

export const defaultConfig: LintConfig = {
  rules: {},
};

export function normalizeConfig(config: LintConfig): LintConfig {
  return {
    ...config,
    rules: { ...config.rules },
  };
}

export function loadConfig(configPath: string): LintConfig {
  const resolvedPath = resolve(configPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  return normalizeConfig(JSON.parse(content) as LintConfig);
}

export function loadConfigFromDefaults(cwd: string = process.cwd()): LintConfig | null {
  const candidates = [
    '.spectotallintrc.json',
    '.spectotallintrc',
    'spectotal-lint.config.json',
  ];

  for (const filename of candidates) {
    const path = resolve(cwd, filename);
    if (!existsSync(path)) continue;
    return loadConfig(path);
  }

  return null;
}

export function getRuleSeverity(
  ruleConfig: RuleConfigValue | undefined,
): 'error' | 'warning' | 'info' | null {
  if (!ruleConfig || ruleConfig === 'off') {
    return null;
  }

  if (typeof ruleConfig === 'object') {
    if (ruleConfig.enabled === false) return null;
    return ruleConfig.severity ?? 'error';
  }

  return ruleConfig;
}

export function isRuleEnabled(config: LintConfig, ruleName: string): boolean {
  return getRuleSeverity(config.rules?.[ruleName]) !== null;
}

import type { NormativeLevel } from './types.js';

const INFERENCE_RULES: Array<{ level: NormativeLevel; test: RegExp }> = [
  { level: 'MUST NOT', test: /\bmust\s+not\b/i },
  { level: 'MUST', test: /\bmust\b/i },
  { level: 'SHOULD NOT', test: /\bshould\s+not\b/i },
  { level: 'SHOULD', test: /\bshould\b/i },
  { level: 'MAY', test: /\bmay\b/i },
  { level: 'NOTE', test: /^\s*note\b[:\s-]/i },
];

export function inferLevel(text: string): NormativeLevel {
  for (const rule of INFERENCE_RULES) {
    if (rule.test.test(text)) {
      return rule.level;
    }
  }

  return 'NONE';
}

export function isRequirement(text: string): boolean {
  const level = inferLevel(text);
  return level !== 'NONE' && level !== 'NOTE';
}

export const Parse = {
  inferLevel,
  isRequirement,
};

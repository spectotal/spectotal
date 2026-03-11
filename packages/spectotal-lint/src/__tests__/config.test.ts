import { describe, expect, it } from 'vitest';
import {
  getRuleSeverity,
  isRuleEnabled,
  normalizeConfig,
  type LintConfig,
} from '../index.js';

describe('lint config', () => {
  it('normalizes config without mutating original rule map', () => {
    const config: LintConfig = {
      rules: {
        'demo/rule': 'warning',
      },
    };

    const normalized = normalizeConfig(config);
    expect(normalized.rules).toEqual(config.rules);
    expect(normalized.rules).not.toBe(config.rules);
  });

  it('resolves object-style rule config', () => {
    expect(getRuleSeverity({ enabled: true })).toBe('error');
    expect(getRuleSeverity({ enabled: true, severity: 'info' })).toBe('info');
    expect(getRuleSeverity({ enabled: false, severity: 'warning' })).toBeNull();
  });

  it('determines if a rule is enabled', () => {
    const config: LintConfig = {
      rules: {
        'demo/on': 'error',
        'demo/off': 'off',
      },
    };

    expect(isRuleEnabled(config, 'demo/on')).toBe(true);
    expect(isRuleEnabled(config, 'demo/off')).toBe(false);
    expect(isRuleEnabled(config, 'demo/unknown')).toBe(false);
  });
});

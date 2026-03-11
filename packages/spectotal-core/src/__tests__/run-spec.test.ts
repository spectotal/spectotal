import { describe, expect, it } from 'vitest';
import { coreHtmlParsers, coreMarkdownParsers, corePlugins } from '@openuji/speculator';
import {
  MemoryFileProvider,
  hydrateWorkspaceFromIndexBundle,
  runSpec,
  type SpectotalProfile,
} from '../index.js';

const w3cLikeProfile: SpectotalProfile = {
  id: 'w3c',
  registerParsers(registry) {
    for (const parser of coreHtmlParsers) {
      registry.registerHtmlParser(parser);
    }
    for (const parser of coreMarkdownParsers) {
      registry.registerMarkdownParser(parser);
    }
  },
  postprocessPlugins: corePlugins,
};

describe('runSpec', () => {
  it('returns structural workspace ast plus index bundle companion', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': '# Intro\n\n<dfn>Widget</dfn>.\n\nThe <a>Widget</a> works.',
    });

    const result = await runSpec({
      entry: '/spec/index.md',
      fileProvider: provider,
      profile: w3cLikeProfile,
    });

    expect(result.profileId).toBe('w3c');
    expect(result.workspaceAst).toBeDefined();
    expect(result.indexBundle).toBeDefined();
    expect(result.diagnostics).toEqual([]);

    const workspaceAst = result.workspaceAst!;
    const indexBundle = result.indexBundle!;

    expect((workspaceAst as Record<string, unknown>).globalIndex).toBeUndefined();
    expect((workspaceAst.documents[0] as Record<string, unknown>).indexes).toBeUndefined();
    expect(indexBundle.documents.length).toBe(1);
    expect(indexBundle.documents[0]?.indexes?.definitions?.length).toBeGreaterThan(0);
  });

  it('hydrates structural ast with index bundle for downstream index-aware consumers', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': '# Intro\n\n<dfn>Widget</dfn>.',
    });

    const result = await runSpec({
      entry: '/spec/index.md',
      fileProvider: provider,
      profile: w3cLikeProfile,
    });

    const hydrated = hydrateWorkspaceFromIndexBundle(result.workspaceAst!, result.indexBundle!);
    expect(hydrated.documents[0]?.indexes?.definitions?.length).toBeGreaterThan(0);
  });
});

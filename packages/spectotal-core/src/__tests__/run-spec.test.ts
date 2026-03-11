import { describe, expect, it } from 'vitest';
import {
  MemoryFileProvider,
  hydrateWorkspaceFromIndexBundle,
  runSpec,
  type SpecConfig,
  type SpectotalProfile,
  type Workspace,
} from '../index.js';

const profileWithRegistry: SpectotalProfile = {
  id: 'w3c',
  registerParsers(registry) {
    registry.registerParser({
      name: 'mock-markdown-parser',
      parse(input) {
        if (!input.content.includes('#')) {
          return {
            diagnostics: ['Missing heading in source content'],
          };
        }

        return {
          document: {
            type: 'document',
            id: input.config.id,
            sourcePos: {
              file: input.entry,
              line: 1,
              column: 1,
            },
            metadata: {
              title: 'Demo Spec',
            },
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: input.content }],
              },
            ],
          },
        };
      },
    });
  },
  postprocessPlugins: [
    {
      name: 'mock-index-builder',
      order: { transform: 10 },
      transform(ctx) {
        ctx.document.indexes = {
          definitions: [
            {
              term: 'Widget',
              id: 'dfn-widget',
              sourcePos: {
                file: ctx.document.sourcePos?.file ?? '/unknown',
                line: 3,
                column: 1,
              },
            },
          ],
        };
        ctx.document.computed = {
          configId: ctx.config.id,
        };
      },
    },
  ],
  postprocessWorkspace(options) {
    const workspace = options.workspace as Workspace;
    workspace.globalIndex = {
      definitions: [
        {
          term: 'Widget',
          id: 'dfn-widget',
        },
      ],
    };

    return {
      workspace,
    };
  },
};

describe('runSpec', () => {
  it('returns structural workspace ast plus index bundle companion', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': '# Intro\n\nWidget works.',
      '/spec/config.json': JSON.stringify({
        id: 'demo-spec',
        deps: ['base'],
        specIri: 'https://example.org/spec/demo',
      }),
    });

    const result = await runSpec({
      entry: '/spec/index.md',
      configPath: '/spec/config.json',
      fileProvider: provider,
      profile: profileWithRegistry,
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
    expect(indexBundle.documents[0]?.indexes?.definitions?.length).toBe(1);
  });

  it('hydrates structural ast with index bundle for downstream index-aware consumers', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': '# Intro\n\nWidget.',
    });

    const result = await runSpec({
      entry: '/spec/index.md',
      fileProvider: provider,
      profile: profileWithRegistry,
      defaultConfig: {
        id: 'doc-a',
      } as Partial<SpecConfig>,
    });

    const hydrated = hydrateWorkspaceFromIndexBundle(result.workspaceAst!, result.indexBundle!);
    expect(hydrated.documents[0]?.indexes?.definitions?.length).toBe(1);
    expect(hydrated.globalIndex?.definitions?.[0]?.term).toBe('Widget');
  });

  it('surfaces parser diagnostics when no parser produces a document', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': 'No heading here',
    });

    const result = await runSpec({
      entry: '/spec/index.md',
      fileProvider: provider,
      profile: profileWithRegistry,
    });

    expect(result.workspaceAst).toBeUndefined();
    expect(result.indexBundle).toBeUndefined();
    expect(result.diagnostics).toContain('Missing heading in source content');
  });
});

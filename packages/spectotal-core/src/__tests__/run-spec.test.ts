import { describe, expect, it } from 'vitest';
import {
  MemoryFileProvider,
  hydrateWorkspaceFromIndexBundle,
  runSpec,
  runWorkspaceSpec,
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
        dependsOn: [],
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
    expect(indexBundle.relationGraph?.topologicalOrder).toEqual(['demo-spec']);
    expect(indexBundle.relationGraph?.edges).toEqual([]);
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

  it('rejects legacy deps config key with explicit diagnostics', async () => {
    const provider = new MemoryFileProvider({
      '/spec/index.md': '# Intro\n\nWidget.',
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

    expect(result.workspaceAst).toBeUndefined();
    expect(result.indexBundle).toBeUndefined();
    expect(result.diagnostics).toContain(
      'Invalid config "/spec/config.json": Legacy config key "deps" is not supported. Use "dependsOn" instead.',
    );
  });

  it('builds multi-entry workspaces deterministically through runWorkspaceSpec', async () => {
    const provider = new MemoryFileProvider({
      '/spec/a.md': '# A\n\nWidget A.',
      '/spec/a.config.json': JSON.stringify({
        id: 'doc-a',
        dependsOn: [],
        specIri: 'urn:doc-a',
      }),
      '/spec/b.md': '# B\n\nWidget B.',
      '/spec/b.config.json': JSON.stringify({
        id: 'doc-b',
        dependsOn: ['doc-a'],
        specIri: 'urn:doc-b',
      }),
    });

    const result = await runWorkspaceSpec({
      entries: [
        { entry: '/spec/a.md', configPath: '/spec/a.config.json' },
        { entry: '/spec/b.md', configPath: '/spec/b.config.json' },
      ],
      fileProvider: provider,
      profile: profileWithRegistry,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.workspaceAst?.documents).toHaveLength(2);
    expect(result.indexBundle?.relationGraph?.edges).toEqual([
      {
        kind: 'dependsOn',
        fromDocumentId: 'doc-a',
        toDocumentId: 'doc-b',
      },
    ]);
    expect(result.indexBundle?.relationGraph?.topologicalOrder).toEqual(['doc-a', 'doc-b']);
  });

  it('keeps first document for duplicate ids and reports deterministic diagnostics', async () => {
    const provider = new MemoryFileProvider({
      '/spec/one.md': '# One\n\nAlpha.',
      '/spec/one.config.json': JSON.stringify({
        id: 'dup-id',
        dependsOn: [],
        specIri: 'urn:dup-id',
      }),
      '/spec/two.md': '# Two\n\nBeta.',
      '/spec/two.config.json': JSON.stringify({
        id: 'dup-id',
        dependsOn: [],
        specIri: 'urn:dup-id',
      }),
    });

    const result = await runWorkspaceSpec({
      entries: [
        { entry: '/spec/one.md', configPath: '/spec/one.config.json' },
        { entry: '/spec/two.md', configPath: '/spec/two.config.json' },
      ],
      fileProvider: provider,
      profile: profileWithRegistry,
    });

    expect(result.workspaceAst?.documents).toHaveLength(1);
    expect(result.workspaceAst?.documents[0]?.id).toBe('dup-id');
    expect(result.diagnostics).toContain(
      'Duplicate document id "dup-id" in "/spec/two.md". Keeping first occurrence from "/spec/one.md".',
    );
  });
});

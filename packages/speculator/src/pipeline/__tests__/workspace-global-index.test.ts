import { describe, expect, it } from 'vitest';
import { SpeculatorPipeline } from '../runner.js';
import { corePlugins } from '#src/postprocess/index.js';
import { MemoryFileProvider } from '#src/file-provider/memory';

describe('workspace global index finalization', () => {
    it('keeps all definition candidates for the same normalized term', async () => {
        const fileProvider = new MemoryFileProvider({
            '/spec/a/index.html': '<p><dfn id="term-a">Term A</dfn></p>',
            '/spec/b/index.html': '<p><dfn id="term-a-2">Term A</dfn></p>',
        });

        const pipeline = new SpeculatorPipeline(corePlugins);
        const result = await pipeline.runWorkspace({
            entries: [
                { entry: '/spec/a/index.html' },
                { entry: '/spec/b/index.html' },
            ],
            fileProvider,
        });

        const workspace = result.workspace;
        expect(workspace).toBeDefined();

        const candidates = (workspace?.globalIndex?.definitions ?? []).filter((entry) => entry.term === 'term a');
        expect(candidates).toHaveLength(2);
        expect(candidates.map((entry) => entry.id).sort()).toEqual(['term-a', 'term-a-2']);
    });
});

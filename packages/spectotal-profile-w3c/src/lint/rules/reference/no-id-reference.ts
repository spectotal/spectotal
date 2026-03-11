import type { InlineLink, SourcePos } from '@spectotal/core';
import type { LintContext, LintRule } from '@spectotal/lint';
import { buildIdIndex, collectReferences } from '../../helpers/reference-helpers.js';

export const noIdReferenceRule: LintRule = {
  meta: {
    name: 'reference/no-id-reference',
    code: 'no-id-reference',
    severity: 'warning',
    description: 'Hardcoded ID references are discouraged; prefer semantic term references',
    category: 'reference',
  },

  create(context: LintContext) {
    const idIndex = buildIdIndex(context.workspace);

    return {
      onDocument(document) {
        const references = collectReferences(document);
        for (const reference of references) {
          if (reference.type === 'sectionReference' || reference.type === 'cite') {
            continue;
          }

          const targetId = reference.targetId;
          const isWorkspaceReference = 'targetDocumentId' in reference;
          if (!targetId || isWorkspaceReference) continue;

          const target = idIndex.get(targetId);
          const location = target
            ? ` (defined at ${target.sourcePos?.file}:${target.sourcePos?.line})`
            : '';
          context.report({
            message: `Reference to ID "${targetId}" is discouraged${location}. Use semantic lookup with data-link-for.`,
            file: reference.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
            sourcePos: reference.sourcePos,
          });
        }

        function walk(node: unknown): void {
          if (!node || typeof node !== 'object') return;
          const record = node as Record<string, unknown>;

          if (record.type === 'link') {
            const url = (record.url as string | undefined) ?? '';
            if (url.startsWith('#')) {
              const linkNode = record as unknown as InlineLink;
              const location = linkNode
                ? ` (defined at ${linkNode.sourcePos?.file}:${linkNode.sourcePos?.line})`
                : '';
              context.report({
                message: `Internal link to ID "${url}" found${location}. Use semantic references where possible.`,
                file: linkNode?.sourcePos?.file ?? '<unknown>',
                sourcePos: record.sourcePos as SourcePos | undefined,
              });
            }
          }

          const children = record.children;
          if (Array.isArray(children)) {
            for (const child of children) {
              walk(child);
            }
          }
        }

        for (const child of document.children ?? []) {
          walk(child);
        }
      },
    };
  },
};

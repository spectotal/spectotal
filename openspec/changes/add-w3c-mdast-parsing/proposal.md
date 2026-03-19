## Why

The W3C profile currently exposes a markdown parse surface, but it is still a stub that returns an empty document and does not exercise the repository's intended markdown-first pipeline. That leaves Spectotal without a real path from composed markdown sources into W3C draft nodes, prevents include-aware section assembly from becoming testable, and leaves raw HTML handling undefined at the point where the profile is supposed to own it.

This change establishes the first real W3C markdown pipeline around the `syntax-tree` mdast ecosystem, using mdast as the primary source model, selective raw HTML parsing for generic element nodes, and explicit provenance capture so later W3C assembly can build canonical section structure from composed content.

Scope:
- Implement a real mdast-based W3C markdown parser inside `@spectotal/profile-w3c`.
- Implement a profile-guided composition boundary where `@spectotal/profile-w3c` owns markdown include recognition and `@spectotal/source-compose` owns generic composition, cycle checks, fragment splicing, and provenance preservation.
- Keep source composition isomorphic so the same composition logic can run in both server and browser environments.
- Implement W3C assembly/normalization that turns parsed heading flow into canonical section structure.
- Update playground fixtures and manual examples to demonstrate the new behavior.

Non-goals:
- No new shared markdown parsing package outside the W3C profile.
- No standalone `.html` document or include support for v1.
- No MDX mode or arbitrary "markdown inside any raw HTML block" dialect extension for v1.
- No kernel-owned heading, section, or tag semantics.

## What Changes

- Add mdast-based parsing to `@spectotal/profile-w3c` so headings, paragraphs, text, directives, and supported HTML/custom tags map into W3C draft nodes instead of an empty draft document.
- Use the `syntax-tree` markdown ecosystem as the parser frontend, keeping mdast as the main profile-local source tree and using a selective raw HTML branch only when W3C needs actual element/tag structure.
- Define how structural include directives are recognized from markdown-first input inside `@spectotal/profile-w3c` and lay the directive-parsing foundation for later W3C semantic containers such as note/example/issue/requirement blocks.
- Refactor source composition so the kernel expands profile-supplied include parts before parsing, preserves include-site provenance, and provides parser-consumable fragment metadata rather than a single-fragment stub.
- Keep markdown source composition runtime-agnostic by using browser-safe composition logic rather than a Node-only filesystem-bound implementation.
- Use an async loader/resolver contract based on `URL` objects so browser and server hosts share the same composition interface.
- Extend source provenance so draft and canonical nodes can carry include ancestry and source locations without pushing section semantics into the kernel.
- Add W3C assembly/normalization that consumes parsed heading flow plus provenance context to build canonical `section` structure, including the existing include alignment scenario.
- Keep HTML/custom-tag classification policy inside `@spectotal/profile-w3c` and map parsed tags into generic `flowElement`, `phrasingElement`, and `voidElement` nodes.
- Update playground fixtures, local scenarios, and manual examples to cover single-document parsing, include composition, and HTML/container behavior.
- Add the profile-local runtime dependencies needed for mdast parsing and selective raw HTML parsing.

## Capabilities

### New Capabilities
- `w3c-markdown-parser`: Defines how the W3C profile maps mdast, directives, raw HTML islands, and provenance into W3C draft nodes and canonical assembly inputs.

### Modified Capabilities
- `kernel-ast`: Source provenance carries enough include ancestry for later profile assembly without encoding profile semantics in the kernel.
- `profile-parsing`: W3C parsing moves from a stub to a concrete mdast-based parser with profile-local HTML/tag handling, markdown include recognition, and provenance capture for later assembly.
- `profile-assembly`: W3C assembly uses parsed heading flow and include-site provenance to build canonical section hierarchy from composed markdown.
- `source-composition`: A generic kernel composition engine expands profile-supplied include parts into composed flow with fragment provenance that downstream W3C parsing and assembly can consume.

## Impact

Affected packages:
- `packages/kernel/ast`
- `packages/kernel/source-compose`
- `packages/profiles/profile-w3c`
- `apps/playground`

Unchanged packages:
- `packages/kernel/ast-query`
- `packages/kernel/ast-schema`
- `packages/kernel/ast-validate`
- `packages/kernel/ast-patch`
- `packages/kernel/workspace-graph`
- `packages/kernel/pipeline`
- `packages/kernel/derivations`
- `packages/profiles/profile-gherkin`

Dependencies and tooling:
- Add mdast-front-end dependencies under `@spectotal/profile-w3c`.
- Add selective raw HTML parsing dependencies under `@spectotal/profile-w3c` for generic element recovery.
- Keep `packages/kernel/source-compose` free of Node-only runtime dependencies so it can execute in browser and server environments.

Config, include behavior, and graph impact:
- Workspace config layering and document config layering remain unchanged.
- Workspace graph behavior remains unchanged.
- Include behavior changes from a stubbed single-fragment composition path to profile-guided include expansion with preserved provenance before profile parsing.
- Composition runtime changes from an effectively local stub to an explicit isomorphic contract that works with browser- or server-provided source loading.

Playground updates:
- Update `apps/playground/fixtures/w3c/single/basic.md`
- Update `apps/playground/fixtures/w3c/includes/index.md`
- Update `apps/playground/fixtures/w3c/includes/conformance.md`
- Update `apps/playground/examples/parse-w3c-single.ts`
- Update `apps/playground/examples/parse-w3c-include.ts`
- Update `apps/playground/scenarios/parse-w3c-single.ts`
- Update `apps/playground/scenarios/parse-w3c-include.ts`
- Add coverage for HTML/container parsing behavior in fixtures, scenarios, or examples

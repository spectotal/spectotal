## 1. Provenance And Composition Contracts

- [x] 1.1 Extend `packages/kernel/ast` provenance types so draft and canonical nodes can carry authored source location plus include ancestry.
- [x] 1.2 Replace the single-fragment stub in `packages/kernel/source-compose` with markdown include expansion that uses an async `URL`-based `resolve`/`load` host contract and produces ordered composed fragments with preserved provenance metadata.
- [x] 1.3 Keep `packages/kernel/source-compose` free of Node-only runtime assumptions so the same composition logic can execute in browser and server environments.
- [x] 1.4 Add or update `packages/kernel/source-compose` coverage for relative `URL` resolution, include splicing order, provenance retention, include cycle diagnostics, and isomorphic browser/server execution behavior.

## 2. W3C Mdast Parsing

- [x] 2.1 Add the mdast and selective raw-HTML parsing dependencies needed by `packages/profiles/profile-w3c` and create the internal parse module layout.
- [x] 2.2 Implement mdast-to-draft mapping for headings, paragraphs, text, and phrasing content in `packages/profiles/profile-w3c`.
- [x] 2.3 Implement raw HTML recovery and mapping to W3C `flowElement`, `phrasingElement`, and `voidElement` nodes through the existing profile-local tag classification helpers.
- [x] 2.4 Update the W3C parser surface to consume composed fragments, recognize structural include directives through the composition result, and stamp emitted draft nodes with source provenance.
- [x] 2.5 Add or update package tests in `packages/profiles/profile-w3c` covering simple markdown parsing, raw HTML mapping, and provenance on parsed draft nodes.

## 3. W3C Assembly

- [x] 3.1 Implement a W3C normalizer that assembles flat draft heading flow into canonical `section` structure.
- [x] 3.2 Handle include-aware heading alignment from node provenance and keep headings nested inside generic flow containers scoped to that container subtree.
- [x] 3.3 Add or update W3C assembly-focused tests or scenarios for included heading rebasing and container-scoped heading behavior.

## 4. Playground And Verification

- [x] 4.1 Update `apps/playground/fixtures/w3c/single/basic.md` and `apps/playground/fixtures/w3c/includes/*` to reflect real parser and assembly behavior.
- [x] 4.2 Update `apps/playground/examples/parse-w3c-single.ts` and `apps/playground/examples/parse-w3c-include.ts` to exercise the new parse output, and add HTML/container coverage in examples or scenarios.
- [x] 4.3 Update `apps/playground/scenarios/parse-w3c-single.ts` and `apps/playground/scenarios/parse-w3c-include.ts` and add any needed local scenario for raw HTML/container behavior.
- [x] 4.4 Run the relevant package builds, tests, and playground verification so the new parser, composition, and assembly behavior are all manually inspectable.

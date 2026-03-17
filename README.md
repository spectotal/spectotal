# Spectotal

Spectotal is a profile-driven document compiler platform.

It separates:
- a semantic-agnostic AST kernel
- a workspace graph kernel for compiling many documents together
- a source composition kernel for include expansion
- profile packages that define meaning, parsing, normalization, validation, and derivations
- tooling packages for playground verification and manual inspection

## Architecture rules

1. Kernel packages never import profile packages.
2. AST mutation happens only through `@spectotal/ast-patch`.
3. Config normalization produces a `CompilePlan`, never AST metadata.
4. Derivations are read-only over a canonical AST.
5. W3C is a profile, not the platform.
6. Gherkin is a profile, not a parser special case.
7. Multi-document compilation is a first-class kernel feature through a workspace graph.
8. Includes are expanded in source composition before semantic section assembly.
9. For v1, markdown parsing lives directly inside `@spectotal/profile-w3c`.
10. No intermediate IR is required between mdast and `AstDraft` in v1.
11. After each behavior change, the playground must be updated with fixtures and manual API examples.

## Core workspace model

Spectotal treats each document AST as a tree, but a workspace as a dependency graph over many documents.

Valid:
- `A -> B -> C`
- `A -> C`

Invalid:
- `B -> C` and `C -> B`

## V1 parsing model

- entry documents are markdown-first
- includes are markdown-first
- `.html` includes are intentionally out of scope for the first iteration
- markdown is parsed to mdast
- `@spectotal/profile-w3c` maps mdast directly into `AstDraft`
- section hierarchy is assembled later from heading depth
- includes splice flow instead of attaching to the deepest open section

Rule:
- includes splice flow
- headings rebuild hierarchy later

## Monorepo layout

- `packages/kernel/*` — tree engine, schema, patch, query, validation, diagnostics, pipeline, derivations, workspace graph, source composition
- `packages/profiles/*` — semantic profiles with parsing and normalization
- `packages/tooling/*` — CLI, lint/search helpers, test utilities
- `apps/playground/*` — fixtures and sample API examples for manual verification
- `openspec/*` — repo-native specification workflow

## TypeScript workflows

- `tsconfig.base.json` holds shared compiler rules that apply to every mode.
- `tsconfig.dev.json` adds wildcard workspace `@spectotal/* -> src` path mapping for editor navigation and no-build development checks.
- `tsconfig.build.base.json` holds build-only compiler defaults for emitted package outputs.
- `tsconfig.json` is the repo-wide development program used by `pnpm typecheck`.
- each package owns its own `tsconfig.build.json` for dist emission; root build orchestration stays in pnpm rather than a hand-maintained TypeScript solution graph.

Scripts:

- `pnpm typecheck` runs the repo-wide development program.
- `pnpm typecheck:packages` runs package-local development checks through each package's own `tsconfig.json`.
- `pnpm build` runs package-local dist builds recursively in pnpm workspace dependency order.
- `pnpm playground:verify` compiles and runs the playground examples against built package entrypoints.
- `pnpm verify` runs development typecheck, package-local typecheck, recursive package builds, and dist-backed playground verification together.

## Suggested OpenSpec sequence

1. `bootstrap-spectotal-monorepo`
2. `introduce-workspace-graph`
3. `introduce-source-composition`
4. `move-markdown-parse-into-profile`
5. `introduce-patch-engine`
6. `require-playground-updates`

After each implemented change:
- update `apps/playground/fixtures`
- update `apps/playground/examples`
- run or inspect the matching example manually
- compare the result against the requirement in `openspec/specs/*`

This scaffold intentionally starts in a fresh folder to keep agent context clean and avoid inheriting assumptions from prior implementations.

# playground

Use this folder to manually verify each iteration.

## Rule
Every behavior-changing iteration must update:
- one or more files in `fixtures/`
- one or more sample calls in `examples/`

## Manual verification workflow

1. pick the fixture that matches the change
2. build packages with `pnpm build` so workspace dependencies emit `dist/` in pnpm dependency order
3. run `pnpm playground:verify` from the repo root, or inspect the corresponding example file directly
4. compare the observed structure or diagnostics with the requirement in `openspec/`
5. only accept the iteration when the playground reflects the new behavior

The verification build compiles `examples/*.ts` without the development-only workspace path overlay, so example imports resolve through the public package entrypoints emitted to `dist/`.

## Current example groups
- `examples/parse-w3c-single.ts`
- `examples/parse-w3c-include.ts`
- `examples/workspace-dag-valid.ts`
- `examples/workspace-dag-cycle.ts`

## Local Scenario Runner

For local API exploration inside `apps/playground`, run one scenario file by path:

```bash
pnpm run scenario -- scenarios/parse-w3c-single.ts
```

The local runner:
- compiles scenario files under `scenarios/`
- runs the selected file by name, similar to a focused test runner
- prints the JSON result
- writes a local snapshot under `.snapshots-local/`, which stays out of git

Create your own exploratory scenario by adding a new `.ts` file under `scenarios/` that exports either:
- a default async function returning any JSON-serializable value
- or a named `run` async function returning any JSON-serializable value

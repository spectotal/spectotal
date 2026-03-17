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

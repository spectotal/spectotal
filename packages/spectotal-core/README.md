# @spectotal/core

Profile-driven foundation for parsing, postprocessing, and emitting two artifacts:

- `workspaceAst`: structural AST (no derived indexes/computed data).
- `indexBundle`: companion index artifact for profile-specific derived data.

## Main API

```ts
import { runSpec } from '@spectotal/core';

const result = await runSpec({
  entry: '/spec/index.md',
  profile,
});
```

`result` shape:

- `workspaceAst?: StructuralWorkspaceAst`
- `indexBundle?: IndexBundle`
- `diagnostics: string[]`
- `profileId: string`

## Key helpers

- `hydrateWorkspaceFromIndexBundle(workspaceAst, indexBundle)`
- `stripDerivedWorkspaceAst(workspace)`
- `createCoreValidationAdapter()`
- `createProfileRegistry([...profiles])`

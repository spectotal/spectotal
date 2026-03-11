# @spectotal/lint

Engine-only lint runner for Spectotal.

This package does not bundle profile rules. Profile packages (for example `@spectotal/profile-w3c`) provide rule sets and recommended configs.

## Use in code

```ts
import { SpectotalLinter } from '@spectotal/lint';
import { w3cLintRules } from '@spectotal/profile-w3c';

const linter = new SpectotalLinter(w3cLintRules);
const result = await linter.lint({
  workspaceAst,
  indexBundle,
  config,
});
```

## CLI

```bash
spectotal-lint \
  --workspace workspace.ast.json \
  --index-bundle workspace.indexes.json \
  --profile-module ./node_modules/@spectotal/profile-w3c/dist/index.js
```

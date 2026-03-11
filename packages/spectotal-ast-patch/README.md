# @spectotal/ast-patch

Generic AST patching utilities for Spectotal `Document` and `Workspace` trees.

## Features

- Immutable patch operations: `wrap`, `append`, `prepend`, `replace`, `remove`
- Atomic batch application with `stop-first` or `collect-all`
- Optional validation via injected `validator` adapter
- Optional postprocess round-trip via injected `postprocess` adapter
- Synthetic source position recalculation plugin

## Notes

- This package is profile-agnostic.
- W3C-specific patch recipes (for example normative paragraph wrapping) are provided by `@spectotal/profile-w3c`.

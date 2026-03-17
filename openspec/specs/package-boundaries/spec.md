# package-boundaries Specification

## Purpose
Keep Spectotal modular by enforcing narrow, directional package responsibilities.

## Requirements

### Requirement: Workspace graph is separate from document AST
The repository SHALL keep multi-document graph logic in a dedicated kernel package rather than embedding it into the document AST package.

#### Scenario: Multi-document feature is added
- GIVEN workspace-level dependency behavior is introduced
- WHEN packages are updated
- THEN the graph logic lives in a workspace-focused kernel package
- AND the document AST package remains tree-focused

### Requirement: Source composition is separate from document AST
The repository SHALL keep include composition outside the document AST package.

#### Scenario: Include feature is added
- GIVEN markdown documents can include subdocuments
- WHEN packages are updated
- THEN include composition logic lives in a dedicated composition package
- AND the document AST package remains focused on tree structure

### Requirement: Parsing may live in profile packages
The repository SHALL allow parsing to live in a profile package when only one profile currently owns that syntax-to-semantics mapping.

#### Scenario: W3C is the only markdown-first profile
- GIVEN only the W3C profile currently performs mdast-based parsing
- WHEN package boundaries are chosen
- THEN markdown semantic parsing may remain inside `@spectotal/profile-w3c`
- AND extraction into a separate shared parsing package is deferred until reuse is real

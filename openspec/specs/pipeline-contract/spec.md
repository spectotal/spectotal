# pipeline-contract Specification

## Purpose
Define the stable compiler stage boundaries for Spectotal.

## Requirements

### Requirement: Workspace planning before document parse
The compiler SHALL build and validate workspace-level planning before dependency-ordered document stages execute.

#### Scenario: Multiple documents share defaults
- GIVEN a workspace contains shared defaults and document-local overrides
- WHEN planning completes
- THEN the compiler has a workspace plan and effective document plans
- AND parse can run with the correct effective config for each document

### Requirement: Source composition before profile parse
The compiler SHALL compose document includes before profile parsing.

#### Scenario: Markdown include is present
- GIVEN a markdown document includes another markdown document
- WHEN compilation proceeds
- THEN source composition produces ordered composed input
- AND profile parsing sees the included content in flow order

### Requirement: Section assembly after composed parsing
The compiler SHALL assemble heading-based hierarchy after composed content is parsed into a combined draft flow.

#### Scenario: Included h2 follows local h3
- GIVEN a local h3 is followed by an include containing an h2
- WHEN normalization assembles sections
- THEN the h2 closes the deeper heading scope as needed
- AND it becomes a sibling-level section rather than a child of the previous h3 section

### Requirement: Read-only derivations
Derivation stages SHALL not mutate canonical AST.

#### Scenario: Index generation
- GIVEN derivation plugins compute indexes and search facts
- WHEN they run
- THEN they return artifacts separately
- AND the canonical AST remains unchanged

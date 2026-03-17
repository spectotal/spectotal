# workspace-graph Specification

## Purpose
Define how Spectotal compiles many documents together through a workspace dependency graph with shared workspace config, document-level overrides, and graph validation.

## Requirements

### Requirement: Multi-document workspace
The platform SHALL compile multiple documents as one workspace.

#### Scenario: Workspace contains many entry documents
- GIVEN a workspace contains documents A, B, and C
- WHEN the workspace is compiled
- THEN all documents are planned and tracked in one workspace graph
- AND shared workspace defaults are available to all documents

### Requirement: Workspace and document config layering
The platform SHALL support shared workspace config and document-local config.

#### Scenario: Document override exists
- GIVEN workspace config defines shared defaults
- AND document B defines a document-local override
- WHEN planning completes
- THEN B receives the merged effective plan
- AND documents without overrides inherit workspace defaults

### Requirement: Directed dependency edges
The workspace SHALL model directed document dependencies.

#### Scenario: Dependency ordering
- GIVEN document A depends on B and C
- AND document B depends on C
- WHEN the workspace graph is built
- THEN the graph records edges A -> B, A -> C, and B -> C
- AND dependency-ordered stages can process C before B before A

### Requirement: Cycle diagnostics
The workspace graph SHALL reject dependency cycles with diagnostics.

#### Scenario: Cycle is introduced
- GIVEN document B depends on C
- AND document C depends on B
- WHEN graph validation runs
- THEN the cycle is reported as a diagnostic
- AND dependency-ordered stages do not proceed as if the graph were valid

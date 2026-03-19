# pipeline-contract Specification

## Purpose
Define the stable compiler stage boundaries for Spectotal.

## Requirements

### Requirement: Workspace planning before document stages
The compiler SHALL build and validate workspace-level planning before dependency-ordered document stages execute.

#### Scenario: Multiple documents share defaults
- GIVEN a workspace contains shared defaults and document-local overrides
- WHEN planning completes
- THEN the compiler has a workspace plan and effective document plans
- AND document stages can run with the correct effective config for each document

### Requirement: Source composition before profile stages
The compiler SHALL compose document includes before profile parsing and profile assembly.

#### Scenario: Include is present
- GIVEN a document includes another source
- WHEN compilation proceeds
- THEN source composition produces composed content with preserved provenance
- AND later profile stages receive that composed content as input

### Requirement: Profile assembly produces canonical AST
The compiler SHALL run profile-defined assembly after profile parsing and before derivation stages.

#### Scenario: Profile produces canonical structure
- GIVEN profile parsing has produced draft profile content
- WHEN profile assembly runs
- THEN the compiler produces canonical AST according to profile-defined assembly rules
- AND later derivation stages operate on that canonical AST

### Requirement: Read-only derivations
Derivation stages SHALL not mutate canonical AST.

#### Scenario: Index generation
- GIVEN derivation plugins compute indexes and search facts
- WHEN they run
- THEN they return artifacts separately
- AND the canonical AST remains unchanged
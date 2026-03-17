# derivation-contract Specification

## Purpose
Define how Spectotal computes read-only artifacts from canonical AST.

## Requirements

### Requirement: Separate artifact bundle
Derived outputs SHALL be returned outside the AST.

#### Scenario: TOC and numbering
- GIVEN the derivation runner computes TOC and numbering
- WHEN derivations finish
- THEN results are available in a derivation bundle
- AND no derived state is persisted inside the canonical AST

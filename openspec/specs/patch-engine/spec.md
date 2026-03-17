# patch-engine Specification

## Purpose
Define the only allowed mutation mechanism for canonical AST updates.

## Requirements

### Requirement: Centralized mutation
AST mutation SHALL happen only through the patch engine.

#### Scenario: Transform modifies structure
- GIVEN a transform needs to insert or replace nodes
- WHEN the transform runs
- THEN it emits patches
- AND the engine applies them centrally

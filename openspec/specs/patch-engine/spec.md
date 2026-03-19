# patch-engine Specification

## Purpose
Define the only allowed mutation mechanism for canonical AST updates.
## Requirements
### Requirement: Centralized mutation
AST mutation SHALL happen only through the patch engine, and the patch engine SHALL apply the reduced `insert`, `replace`, and `remove` patch contract against canonical AST values.

#### Scenario: Transform emits structural patches
- **WHEN** a transform needs to insert, replace, or remove canonical AST nodes
- **THEN** it emits `AstPatch` values
- **AND** the patch engine applies them in patch-list order against the latest successful AST state
- **AND** the input AST value is not mutated in place

### Requirement: Insert placement modes
The patch engine SHALL support insertion at the start, end, or explicit index of a parent node's children, and before or after an existing sibling node.

#### Scenario: Insert into a parent by index
- **WHEN** an insert patch targets a parent node with `at: "start"`, `at: "end"`, or `at: "index"`
- **THEN** the new nodes are inserted into that parent's child list at the resolved position

#### Scenario: Insert around a sibling
- **WHEN** an insert patch targets an existing node with `at: "before"` or `at: "after"`
- **THEN** the new nodes are inserted into that node's parent child list on the requested side

### Requirement: Root mutation safeguards
The patch engine SHALL reject illegal document-root mutations and SHALL validate any accepted root replacement against the profile's structural schema for the declared root kind.

#### Scenario: Remove root is forbidden
- **WHEN** a remove patch targets the root node
- **THEN** the engine reports a `PATCH_ROOT_REMOVE_FORBIDDEN` diagnostic
- **AND** the AST remains unchanged for that patch

#### Scenario: Root replacement requires one structurally valid schema-compatible node
- **WHEN** a replace patch targets the root node
- **THEN** the engine accepts exactly one replacement node whose kind matches the schema root kind
- **AND** that replacement node satisfies the profile's structural schema for the root kind
- **AND** any other root replacement request yields a diagnostic instead of mutating the AST

### Requirement: Structural schema validation and diagnostics
The patch engine SHALL validate inserted and replacement nodes against the profile's generated structural validators and patch-rule tables, including accepted child kinds and child cardinality, and SHALL report diagnostics for invalid targets, indexes, or schema violations.

#### Scenario: Inserted child kind is not accepted
- **WHEN** an insert or replace patch would place a child kind that the resolved parent schema does not accept
- **THEN** the engine reports a `PATCH_SCHEMA_VIOLATION` diagnostic
- **AND** the AST remains unchanged for that patch

#### Scenario: Inserted or replacement node is structurally invalid
- **WHEN** an insert or replace patch includes a node that does not satisfy the profile's structural schema
- **THEN** the engine reports a `PATCH_SCHEMA_VIOLATION` diagnostic
- **AND** the AST remains unchanged for that patch

#### Scenario: Resulting child count violates parent cardinality
- **WHEN** an insert, replace, or remove patch would leave a parent with fewer than the minimum or more than the maximum allowed children
- **THEN** the engine reports a `PATCH_SCHEMA_VIOLATION` diagnostic
- **AND** the AST remains unchanged for that patch

#### Scenario: Target cannot be resolved
- **WHEN** a patch target path or `nodeId` does not resolve in the current AST
- **THEN** the engine reports a `PATCH_TARGET_NOT_FOUND` diagnostic
- **AND** later patches still run

#### Scenario: Insert index is out of range
- **WHEN** an insert patch uses `at: "index"` with an index outside the parent's valid insertion range
- **THEN** the engine reports a `PATCH_INVALID_INDEX` diagnostic
- **AND** the AST remains unchanged for that patch


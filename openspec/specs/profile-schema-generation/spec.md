# profile-schema-generation Specification

## Purpose
Define how profile packages author one structural schema source and derive profile-owned runtime schema artifacts from it.
## Requirements
### Requirement: Single-source profile schema definition
The system SHALL allow a profile package to author one declarative schema definition that describes its node kinds, fields, and child constraints, and SHALL derive the runtime structural schema artifacts for that profile from that single definition.

#### Scenario: W3C schema is authored once
- **WHEN** the W3C profile declares its node kinds, fields, and child constraints in one authored schema definition
- **THEN** the build derives runtime schema metadata, validator artifacts, and patch-rule tables for the W3C profile
- **AND** those derived artifacts do not require a second handwritten structural source

### Requirement: High-level schema authoring helpers
The system SHALL allow authored profile schemas to define reusable content groups, reusable field bundles, and open record fields that are expanded into concrete runtime node schemas during generation.

#### Scenario: W3C reuses named content groups
- **WHEN** the W3C profile authors multiple node kinds against named content groups
- **THEN** generation expands those group references into concrete accepted child-kind lists in the runtime schema metadata
- **AND** the authored schema does not need to repeat long accepted-child lists across each affected node definition

#### Scenario: Open attribute maps are structurally validated
- **WHEN** an authored schema defines an open record field for element attributes
- **THEN** generated structural validation allows arbitrary attribute names
- **AND** each attribute value is validated against the authored scalar value types for that field

### Requirement: Generic element families avoid per-tag node proliferation
The system SHALL allow a profile to model arbitrary HTML and custom tags through a small set of role-based node kinds instead of one structural node kind per tag.

#### Scenario: W3C models HTML and custom tags by content role
- **GIVEN** the W3C profile supports HTML and custom tags
- **WHEN** it defines `flowElement`, `phrasingElement`, and `voidElement` node kinds with `tagName` and `attributes`
- **THEN** generation derives runtime schema metadata, validator entrypoints, patch-rule tables, and profile node types for those kinds
- **AND** the profile does not need one authored node kind per HTML tag

### Requirement: Generated artifacts remain profile-owned
The system SHALL keep generated structural schema artifacts in the profile package that owns the authored schema definition.

#### Scenario: Profile exports its generated schema bundle
- **WHEN** structural validation or patch application needs profile-specific schema artifacts
- **THEN** the caller receives those artifacts from the owning profile package's exported schema bundle
- **AND** kernel packages remain semantic-agnostic

### Requirement: Generated artifacts support hot-path validation
The system SHALL generate runtime validator entrypoints and patch-rule tables that can be consumed without compiling or interpreting the authored schema definition during validation or patch application.

#### Scenario: Validation uses precomputed runtime artifacts
- **WHEN** canonical AST validation or patch application runs for a profile
- **THEN** it uses generated validator functions and generated patch-rule lookups for that profile
- **AND** it does not compile the profile schema during that runtime call

#### Scenario: Generic element validation stays kind-based
- **WHEN** validation or patch application processes a generic HTML/custom element node
- **THEN** it dispatches through the generated validator and patch-rule entry for that node kind
- **AND** it does not require per-tag runtime validators or per-tag patch rules keyed by `tagName`

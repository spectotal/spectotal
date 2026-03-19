## ADDED Requirements

### Requirement: Source provenance carries include ancestry
The kernel SHALL allow source provenance to carry authored source location together with include ancestry in a semantic-agnostic form.

#### Scenario: Draft node originated in included markdown
- **WHEN** source composition splices markdown document B into markdown document A and profile parsing emits a draft node from content authored in B
- **THEN** the node provenance can record B as the authored source location
- **AND** it can record the include ancestry through A without embedding profile-specific structure rules

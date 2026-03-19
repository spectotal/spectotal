# profile-assembly Specification

## Purpose
Define how profiles assemble canonical document structure from composed content and provenance.

## Requirements

### Requirement: Profiles define canonical assembly rules
A profile SHALL define how composed content is assembled into canonical structure.

#### Scenario: Profile assembles draft content
- GIVEN composed content with preserved provenance
- WHEN profile assembly runs
- THEN the profile produces canonical structure according to its own assembly rules
- AND kernel stages remain agnostic to profile-specific structural semantics

### Requirement: Markdown profile assembles heading hierarchy from provenance context
The Markdown profile SHALL assemble heading-based hierarchy using include-site provenance as structural context.

#### Scenario: Included h2 aligns to parent h2
- GIVEN a parent markdown document includes another markdown document inside an h2 context
- AND the included document begins with an h2 heading
- WHEN markdown profile assembly runs
- THEN the included h2 is assembled at the parent h2 level
- AND deeper included headings are assembled relative to that aligned level


### Requirement: Asset includes remain embedded unless profile declares otherwise
A profile SHALL preserve embedded assets as atomic content unless the profile explicitly defines structural treatment for them.

#### Scenario: Mermaid include in markdown
- GIVEN composed content contains a Mermaid include
- WHEN profile assembly runs
- THEN the Mermaid content becomes an embedded node at the include location
- AND it does not participate in structural hierarchy assembly
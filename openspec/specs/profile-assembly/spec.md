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
The Markdown profile SHALL assemble heading-based hierarchy from parsed draft flow using source provenance and include ancestry as structural context.

#### Scenario: Included h2 aligns to parent h2
- GIVEN a parent markdown document includes another markdown document inside an h2 context
- AND the included document begins with an h2 heading
- AND markdown profile assembly runs on draft nodes carrying include provenance
- WHEN markdown profile assembly runs
- THEN the included h2 is assembled at the parent h2 level
- AND deeper included headings are assembled relative to that aligned level

### Requirement: Headings inside generic flow containers assemble within container scope
The Markdown profile SHALL assemble headings found inside generic flow containers within that container subtree rather than promoting them into the outer document section stack.

#### Scenario: Heading appears inside an aside-like flow element
- GIVEN parsed draft flow contains a generic flow element whose children include a heading and paragraph content
- WHEN markdown profile assembly runs
- THEN markdown profile assembly produces section structure within that flow element subtree
- AND the heading does not escape into the outer document hierarchy


### Requirement: Asset includes remain embedded unless profile declares otherwise
A profile SHALL preserve embedded assets as atomic content unless the profile explicitly defines structural treatment for them.

#### Scenario: Mermaid include in markdown
- GIVEN composed content contains a Mermaid include
- WHEN profile assembly runs
- THEN the Mermaid content becomes an embedded node at the include location
- AND it does not participate in structural hierarchy assembly

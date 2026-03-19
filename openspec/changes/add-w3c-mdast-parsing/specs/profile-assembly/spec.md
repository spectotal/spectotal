## MODIFIED Requirements

### Requirement: Markdown profile assembles heading hierarchy from provenance context
The Markdown profile SHALL assemble heading-based hierarchy from parsed draft flow using source provenance and include ancestry as structural context.

#### Scenario: Included h2 aligns to parent h2
- **WHEN** a parent markdown document includes another markdown document inside an h2 context, the included document begins with an h2 heading, and markdown profile assembly runs on draft nodes carrying include provenance
- **THEN** the included h2 is assembled at the parent h2 level
- **AND** deeper included headings are assembled relative to that aligned level

## ADDED Requirements

### Requirement: Headings inside generic flow containers assemble within container scope
The Markdown profile SHALL assemble headings found inside generic flow containers within that container subtree rather than promoting them into the outer document section stack.

#### Scenario: Heading appears inside an aside-like flow element
- **WHEN** parsed draft flow contains a generic flow element whose children include a heading and paragraph content
- **THEN** markdown profile assembly produces section structure within that flow element subtree
- **AND** the heading does not escape into the outer document hierarchy

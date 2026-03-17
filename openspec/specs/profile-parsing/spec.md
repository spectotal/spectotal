# profile-parsing Specification

## Purpose
Define how active profile packages parse source syntax into draft semantic nodes.

## Requirements

### Requirement: Profile-owned parsing
The active profile SHALL own semantic parsing for its domain.

#### Scenario: W3C markdown parsing
- GIVEN the W3C profile is active
- WHEN markdown source is parsed
- THEN the W3C profile is responsible for mapping mdast into W3C draft nodes
- AND generic kernel packages remain semantic-agnostic

### Requirement: Markdown-first v1
The first implementation SHALL support markdown-first parsing without requiring standalone HTML document support.

#### Scenario: Entry document is markdown
- GIVEN an entry document is markdown
- WHEN the compiler parses it
- THEN the implementation can produce draft nodes from mdast directly
- AND standalone `.html` includes are not required for the initial release

### Requirement: No mandatory intermediate IR
The first implementation SHALL NOT require an intermediate IR between mdast and draft semantic nodes.

#### Scenario: mdast node is visited
- GIVEN the parser visits mdast content
- WHEN semantic meaning is recognized
- THEN the parser may emit draft nodes directly
- AND no extra translation layer is required as a precondition

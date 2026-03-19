# profile-parsing Specification

## Purpose
Define how active profile packages parse source syntax into draft semantic nodes.
## Requirements
### Requirement: Profile-owned parsing
The active profile SHALL own semantic parsing for its domain, including any HTML or custom-tag classification policy needed by its parsing layer.

#### Scenario: W3C tag classification stays profile-local
- GIVEN the W3C profile needs to classify an HTML or custom tag while parsing markdown content
- WHEN that tag is mapped into the profile's structural node kinds
- THEN the W3C profile defines whether it behaves as flow, phrasing, or void content
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


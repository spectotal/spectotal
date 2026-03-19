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
The first implementation SHALL support markdown-first parsing without requiring standalone HTML document support, using mdast as the primary source tree for markdown documents.

#### Scenario: Entry document is markdown
- GIVEN an entry document is markdown
- WHEN the compiler parses it
- THEN the implementation can produce draft nodes from mdast directly
- AND standalone `.html` includes are not required for the initial release
- AND profile-local raw HTML recovery may be used only for raw HTML islands encountered inside markdown content

### Requirement: No mandatory intermediate IR
The first implementation SHALL NOT require an intermediate IR between mdast and draft semantic nodes.

#### Scenario: mdast node is visited
- GIVEN the parser visits mdast content
- WHEN semantic meaning is recognized
- THEN the parser may emit draft nodes directly
- AND no extra translation layer is required as a precondition

### Requirement: Profile owns source-syntax recognition used for composition
The active profile SHALL own any source-syntax recognition needed to split authored documents into composition parts before parsing.

#### Scenario: W3C composition markers are recognized through a parser-backed frontend
- GIVEN the W3C profile supports `::include{src="..." format="markdown"}` and ReSpec-like HTML include markers in markdown source
- WHEN composition recognition runs
- THEN `@spectotal/profile-w3c` recognizes that syntax for composition
- AND generic kernel packages do not scan raw markdown text for that directive

### Requirement: Composition and parsing share the markdown frontend
The active profile SHALL use one shared markdown frontend configuration for parser-backed composition recognition and later draft parsing when they depend on the same source syntax.

#### Scenario: W3C directive grammar changes
- GIVEN the W3C profile updates its directive grammar for markdown
- WHEN composition recognition and draft parsing run
- THEN they use the same markdown frontend configuration
- AND directive parsing behavior does not drift between those stages

### Requirement: Draft nodes preserve source provenance for later assembly
Profile parsing SHALL emit draft nodes with source provenance sufficient for later profile assembly to interpret include-expanded markdown flow.

#### Scenario: Included fragment emits heading nodes
- GIVEN source composition has expanded an included markdown fragment
- WHEN profile parsing emits draft heading and paragraph nodes from that fragment
- THEN those draft nodes retain authored source location
- AND they retain include ancestry needed by later assembly

### Requirement: Raw HTML recovery stays profile-local
The active profile SHALL own any recovery of raw HTML fragments into structured generic element nodes.

#### Scenario: W3C parser needs tag structure from raw HTML
- GIVEN markdown content contains raw HTML
- WHEN the W3C parser needs actual tag names or attributes to emit generic element nodes
- THEN the W3C profile performs that recovery inside its parsing layer
- AND generic kernel packages do not interpret raw HTML themselves

## MODIFIED Requirements

### Requirement: Markdown-first v1
The first implementation SHALL support markdown-first parsing without requiring standalone HTML document support, using mdast as the primary source tree for markdown documents.

#### Scenario: Entry document is markdown
- **WHEN** an entry document is markdown and the compiler parses it
- **THEN** the implementation can produce draft nodes from mdast directly
- **AND** standalone `.html` includes are not required for the initial release
- **AND** profile-local raw HTML recovery may be used only for raw HTML islands encountered inside markdown content

## ADDED Requirements

### Requirement: Profile owns source-syntax recognition used for composition
The active profile SHALL own any source-syntax recognition needed to split authored documents into composition parts before parsing.

#### Scenario: W3C markdown include syntax is recognized for composition
- **WHEN** the W3C profile supports `::: include ... :::` in markdown source
- **THEN** `@spectotal/profile-w3c` recognizes that syntax for composition
- **AND** generic kernel packages do not scan raw markdown text for that directive

### Requirement: Draft nodes preserve source provenance for later assembly
Profile parsing SHALL emit draft nodes with source provenance sufficient for later profile assembly to interpret include-expanded markdown flow.

#### Scenario: Included fragment emits heading nodes
- **WHEN** source composition has expanded an included markdown fragment and profile parsing emits draft heading and paragraph nodes from that fragment
- **THEN** those draft nodes retain authored source location
- **AND** they retain include ancestry needed by later assembly

### Requirement: Raw HTML recovery stays profile-local
The active profile SHALL own any recovery of raw HTML fragments into structured generic element nodes.

#### Scenario: W3C parser needs tag structure from raw HTML
- **WHEN** markdown content contains raw HTML and the W3C parser needs actual tag names or attributes to emit generic element nodes
- **THEN** the W3C profile performs that recovery inside its parsing layer
- **AND** generic kernel packages do not interpret raw HTML themselves

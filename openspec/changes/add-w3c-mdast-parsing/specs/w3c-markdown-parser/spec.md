## ADDED Requirements

### Requirement: W3C parser maps markdown flow into W3C draft nodes
The W3C markdown parser SHALL map markdown headings, paragraphs, and phrasing content into ordered W3C draft nodes before later section assembly runs.

#### Scenario: Simple markdown document is parsed
- **WHEN** the W3C parser processes a markdown document containing headings and paragraphs
- **THEN** it emits W3C draft heading, paragraph, and text nodes in source order
- **AND** it does not require preassembled section nodes during parsing

### Requirement: W3C parser maps raw HTML tags into generic element families
The W3C markdown parser SHALL map recovered raw HTML tags into generic W3C element families using profile-local tag classification.

#### Scenario: Markdown contains generic HTML tags
- **WHEN** markdown content contains raw HTML representing phrasing, flow, and void tags
- **THEN** the W3C parser emits `phrasingElement`, `flowElement`, or `voidElement` nodes according to W3C tag classification
- **AND** recovered attributes remain attached to those generic element nodes

### Requirement: W3C parser does not invent arbitrary markdown-inside-HTML semantics
The W3C markdown parser SHALL treat raw HTML islands as HTML structure recovery boundaries and MUST NOT invent additional markdown children beyond what the markdown frontend exposes.

#### Scenario: Raw HTML block contains text that stays raw
- **WHEN** the markdown frontend exposes a raw HTML island without parsed markdown children
- **THEN** the W3C parser may recover generic tag structure from that island
- **AND** it does not synthesize extra markdown-derived child nodes that were not present in the parsed markdown content

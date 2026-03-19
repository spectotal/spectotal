# w3c-markdown-parser Specification

## Purpose
Define how the W3C profile composes markdown sources and maps markdown-first input into W3C draft nodes.

## Requirements

### Requirement: W3C profile exposes markdown composition helpers
The W3C markdown profile SHALL expose profile-owned composition helpers that bind markdown include recognition to the generic kernel composition engine.

#### Scenario: Caller composes W3C markdown source
- GIVEN a caller asks the W3C profile to compose a markdown entry document
- WHEN composition starts
- THEN the profile recognizes canonical directive include syntax and the first ReSpec-like HTML include syntax before parsing
- AND it delegates recursion, loading, cycle detection, and fragment splicing to the generic kernel composition engine

### Requirement: Canonical W3C include syntax uses standard directives
The canonical authored include syntax for W3C markdown SHALL use standard directive syntax parsed through the syntax-tree markdown frontend.

#### Scenario: Markdown directive include composes markdown
- GIVEN markdown source contains `::include{src="./fragment.md" format="markdown"}`
- WHEN the W3C composition layer analyzes it
- THEN it recognizes the directive through directive nodes rather than regex scanning
- AND it composes the referenced markdown source
- AND omitted `format` is treated as markdown for this directive syntax

### Requirement: W3C composition supports a first ReSpec-like include form
The W3C composition layer SHALL support a ReSpec-like HTML include marker as an alternate structural include form.

#### Scenario: HTML include marker opts into markdown composition
- GIVEN markdown source contains an HTML element with `data-include="./fragment.md"` and `data-include-format="markdown"`
- WHEN the W3C composition layer analyzes it
- THEN it recognizes the marker as an include
- AND it composes the referenced markdown source

#### Scenario: HTML include marker omits markdown format opt-in
- GIVEN markdown source contains an HTML element with `data-include="./fragment.md"` and no `data-include-format`
- WHEN the W3C composition layer analyzes it
- THEN it reports a structural diagnostic
- AND it does not silently interpret that marker as markdown composition

### Requirement: W3C parser maps markdown flow into W3C draft nodes
The W3C markdown parser SHALL map markdown headings, paragraphs, and phrasing content into ordered W3C draft nodes before later section assembly runs.

#### Scenario: Simple markdown document is parsed
- GIVEN the W3C parser processes a markdown document containing headings and paragraphs
- WHEN draft parsing runs
- THEN it emits W3C draft heading, paragraph, and text nodes in source order
- AND it does not require preassembled section nodes during parsing

### Requirement: W3C parser maps raw HTML tags into generic element families
The W3C markdown parser SHALL map recovered raw HTML tags into generic W3C element families using profile-local tag classification.

#### Scenario: Markdown contains generic HTML tags
- GIVEN markdown content contains raw HTML representing phrasing, flow, and void tags
- WHEN the W3C parser recovers those tags
- THEN it emits `phrasingElement`, `flowElement`, or `voidElement` nodes according to W3C tag classification
- AND recovered attributes remain attached to those generic element nodes

### Requirement: W3C parser does not invent arbitrary markdown-inside-HTML semantics
The W3C markdown parser SHALL treat raw HTML islands as HTML structure recovery boundaries and MUST NOT invent additional markdown children beyond what the markdown frontend exposes.

#### Scenario: Raw HTML block contains text that stays raw
- GIVEN the markdown frontend exposes a raw HTML island without parsed markdown children
- WHEN the W3C parser recovers generic tag structure from that island
- THEN it does not synthesize extra markdown-derived child nodes that were not present in the parsed markdown content

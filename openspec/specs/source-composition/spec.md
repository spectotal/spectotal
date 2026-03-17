# source-composition Specification

## Purpose
Define how Spectotal composes markdown-first document sources with includes before semantic hierarchy is assembled.

## Requirements

### Requirement: Markdown-first includes
The first implementation SHALL support markdown includes inside markdown documents.

#### Scenario: Markdown document includes markdown
- GIVEN a markdown document includes another markdown document
- WHEN source composition runs
- THEN the composed source preserves include position and provenance
- AND later parsing can process the combined flow in order

### Requirement: Include splices flow
Includes SHALL splice source flow instead of attaching content to the deepest open AST subtree.

#### Scenario: Included heading appears after deeper heading
- GIVEN a markdown document contains an h2, then an h3, then an include containing another h2
- WHEN the include is composed and parsed
- THEN the included h2 appears in the combined flow at the include position
- AND later section assembly treats it as a sibling-level heading rather than appending it to the previous h3 subtree

### Requirement: Include cycle diagnostics
Composition SHALL detect include cycles.

#### Scenario: Two markdown documents include each other
- GIVEN document B includes C
- AND document C includes B
- WHEN composition runs
- THEN diagnostics report the cycle
- AND composition does not silently recurse forever

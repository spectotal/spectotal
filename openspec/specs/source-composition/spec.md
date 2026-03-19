# source-composition Specification

## Purpose
Define how Spectotal composes markdown-first document sources with includes before semantic hierarchy is assembled.

## Requirements

### Requirement: Profile-guided include composition
The first implementation SHALL support markdown includes inside markdown documents through profile-supplied composition parts and expose composed flow in parser-consumable order with preserved source provenance.

#### Scenario: Markdown document includes markdown
- GIVEN the W3C profile parses a markdown document into content and include parts
- WHEN source composition runs
- THEN the composed source preserves include position and provenance
- AND later parsing can process the combined flow in order
- AND the composed source exposes ordered fragment metadata or equivalent position data that lets downstream parsing map emitted nodes back to authored sources

### Requirement: Kernel composition remains markup-agnostic
Source composition SHALL recurse, splice, and preserve provenance without directly parsing profile-specific source syntax.

#### Scenario: Kernel composes W3C markdown includes
- GIVEN the W3C profile recognizes canonical include directives or ReSpec-like HTML include markers
- WHEN it supplies include parts to the kernel composition engine
- THEN the kernel resolves and loads included sources, detects cycles, and splices fragments in order
- AND it does not contain hardcoded markdown directive parsing rules

### Requirement: Adapter diagnostics surface through composition
Source composition SHALL surface structural diagnostics emitted by the active profile composition adapter together with generic composition diagnostics.

#### Scenario: Profile composition marker is invalid
- GIVEN the active profile detects an invalid or unsupported include marker while analyzing source for composition
- WHEN composition runs
- THEN the composition result reports that diagnostic
- AND the kernel still remains syntax-agnostic
- AND invalid composition markers are not silently treated as successful includes

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

### Requirement: Source composition is isomorphic
Source composition SHALL run through the same runtime-agnostic kernel contract in both server and browser environments.

#### Scenario: Browser host composes markdown includes
- GIVEN a browser host provides markdown document contents and include target resolution through the source-composition contract
- WHEN composition runs
- THEN composition expands structural includes and preserves provenance without requiring Node-specific filesystem or path APIs
- AND the resulting composed flow matches the behavior of the same composition contract in a server host

### Requirement: Source composition uses async URL-based resolution
Source composition SHALL resolve and load included documents through an asynchronous contract based on `URL` objects.

#### Scenario: Host resolves include target relative to parent document
- GIVEN source composition encounters an include inside a document identified by a parent `URL`
- WHEN the host resolves the include target
- THEN the host-facing resolution contract receives and returns `URL` values rather than platform-specific path strings
- AND composition can await document loading without changing its browser and server behavior contract

### Requirement: Source composition host contract separates resolution from loading
Source composition SHALL use a host contract that resolves include targets separately from loading document contents.

#### Scenario: Host provides async resolve and load functions
- GIVEN a host integrates with source composition
- WHEN it implements the composition contract
- THEN it provides an async include-resolution function from target string and parent `URL` to resolved `URL`
- AND it provides an async source-loading function from resolved `URL` to document content and normalized document `URL`

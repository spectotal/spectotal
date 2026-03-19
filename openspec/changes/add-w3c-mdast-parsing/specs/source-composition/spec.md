## MODIFIED Requirements

### Requirement: Markdown-first includes
The first implementation SHALL support markdown includes inside markdown documents and expose composed flow in parser-consumable order with preserved source provenance.

#### Scenario: Markdown document includes markdown
- **WHEN** a markdown document includes another markdown document and source composition runs
- **THEN** the composed source preserves include position and provenance
- **AND** later parsing can process the combined flow in order
- **AND** the composed source exposes ordered fragment metadata or equivalent position data that lets downstream parsing map emitted nodes back to authored sources

## ADDED Requirements

### Requirement: Source composition is isomorphic
Source composition SHALL run through the same runtime-agnostic kernel contract in both server and browser environments.

#### Scenario: Browser host composes markdown includes
- **WHEN** a browser host provides markdown document contents and include target resolution through the source-composition contract
- **THEN** composition expands structural includes and preserves provenance without requiring Node-specific filesystem or path APIs
- **AND** the resulting composed flow matches the behavior of the same composition contract in a server host

### Requirement: Source composition uses async URL-based resolution
Source composition SHALL resolve and load included markdown documents through an asynchronous contract based on `URL` objects.

#### Scenario: Host resolves include target relative to parent document
- **WHEN** source composition encounters an include inside a document identified by a parent `URL`
- **THEN** the host-facing resolution contract receives and returns `URL` values rather than platform-specific path strings
- **AND** composition can await document loading without changing its browser and server behavior contract

### Requirement: Source composition host contract separates resolution from loading
Source composition SHALL use a host contract that resolves include targets separately from loading document contents.

#### Scenario: Host provides async resolve and load functions
- **WHEN** a host integrates with source composition
- **THEN** it provides an async include-resolution function from target string and parent `URL` to resolved `URL`
- **AND** it provides an async source-loading function from resolved `URL` to document content and normalized document `URL`

## MODIFIED Requirements

### Requirement: Profile-guided include composition
The first implementation SHALL support markdown includes inside markdown documents through profile-supplied composition parts and expose composed flow in parser-consumable order with preserved source provenance.

#### Scenario: Markdown document includes markdown
- **WHEN** the W3C profile splits a markdown document into content and include parts and source composition runs
- **THEN** the composed source preserves include position and provenance
- **AND** later parsing can process the combined flow in order
- **AND** the composed source exposes ordered fragment metadata or equivalent position data that lets downstream parsing map emitted nodes back to authored sources

### Requirement: Kernel composition remains markup-agnostic
Source composition SHALL recurse, splice, and preserve provenance without directly parsing profile-specific source syntax.

#### Scenario: Kernel composes W3C markdown includes
- **WHEN** the W3C profile recognizes `::: include ... :::` syntax and supplies include parts to the kernel composition engine
- **THEN** the kernel resolves and loads included sources, detects cycles, and splices fragments in order
- **AND** it does not contain hardcoded markdown directive parsing rules

## ADDED Requirements

### Requirement: Source composition is isomorphic
Source composition SHALL run through the same runtime-agnostic kernel contract in both server and browser environments.

#### Scenario: Browser host composes markdown includes
- **WHEN** a browser host provides markdown document contents and include target resolution through the source-composition contract
- **THEN** composition expands structural includes and preserves provenance without requiring Node-specific filesystem or path APIs
- **AND** the resulting composed flow matches the behavior of the same composition contract in a server host

### Requirement: Source composition uses async URL-based resolution
Source composition SHALL resolve and load included documents through an asynchronous contract based on `URL` objects.

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

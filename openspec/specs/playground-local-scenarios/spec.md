# playground-local-scenarios Specification

## Purpose
Define the package-local playground workflow for running one scenario file directly and writing gitignored local snapshots.

## Requirements

### Requirement: Package-local scenario runner
The playground package SHALL provide a local command that runs one scenario file by path.

#### Scenario: Run one scenario file
- **WHEN** the developer runs the playground package scenario command with a file path under `scenarios/`
- **THEN** the runner compiles the scenario files
- **AND** it executes the selected scenario file
- **AND** it prints the scenario output

### Requirement: File-based scenario authoring
The local runner SHALL treat scenario files as the unit of exploration.

#### Scenario: Developer adds a new scenario file
- **WHEN** a developer adds a new `.ts` file under `apps/playground/scenarios/`
- **THEN** the file can be executed directly by passing its path to the local scenario command
- **AND** the file does not require registration in a central catalog

### Requirement: Gitignored local snapshots
The local runner SHALL write scenario output to a gitignored local snapshot path.

#### Scenario: Scenario finishes successfully
- **WHEN** a scenario file returns a JSON-serializable result
- **THEN** the runner writes a normalized snapshot under a gitignored local snapshot directory
- **AND** the snapshot path is derived from the scenario filename

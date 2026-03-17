# package-resolution Specification

## Purpose
Define how workspace packages resolve each other in development, build, and verification workflows.

## Requirements

### Requirement: Dist-backed public package surface
The repository SHALL treat each workspace package's emitted `dist` output as the canonical public entrypoint for build, runtime verification, and future publication workflows.

#### Scenario: Build resolves a sibling package
- **WHEN** a package build or publication-oriented verification resolves an `@spectotal/*` dependency
- **THEN** the resolution target comes from the dependency package's declared `dist` entrypoint
- **AND** the default package contract does not expose sibling `src` files as the public surface

### Requirement: Source-linked development workspace
The repository SHALL provide a development-only workspace resolution mode that maps declared `@spectotal/*` imports to sibling source trees without requiring deep relative imports.

#### Scenario: Developer edits dependent packages together
- **WHEN** a developer typechecks or navigates code in one workspace package during development
- **THEN** imports such as `@spectotal/ast` resolve to the corresponding workspace source
- **AND** cross-package editor navigation works before a full build has been run

### Requirement: Separate development and build TypeScript programs
The repository SHALL keep development-only TypeScript source overlays separate from package build programs so build programs contain only local package sources and emitted package contracts.

#### Scenario: Package-local build is executed
- **WHEN** a package build or build-oriented typecheck runs
- **THEN** sibling package source files are not pulled into the package program through development-only path mappings
- **AND** `rootDir`-bounded package builds can compile without TS6059-style boundary errors

### Requirement: Explicit workspace build graph
The repository SHALL model inter-package build order explicitly through workspace package metadata so dependent packages build against validated upstream outputs.

#### Scenario: Upstream dependency changes
- **WHEN** a workspace package depends on another workspace package during build
- **THEN** the workspace build runner uses declared workspace dependencies to build the dependency before the dependent package
- **AND** missing or stale dependency outputs surface as build failures

### Requirement: Public-entrypoint example verification
The repository SHALL verify manual API examples through public package entrypoints rather than repo-private source paths.

#### Scenario: Playground examples run after a build
- **WHEN** a manual example under `apps/playground/examples/` imports a Spectotal package
- **THEN** it resolves through the package entrypoint intended for consumers
- **AND** existing playground source fixtures remain unchanged unless runtime semantics change

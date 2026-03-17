# kernel-ast Specification

## Purpose
Define the semantic-agnostic tree primitives used by all Spectotal profiles.

## Requirements

### Requirement: Semantic-agnostic kernel
The kernel SHALL represent generic trees without embedding profile-specific concepts.

#### Scenario: W3C and Gherkin coexist
- GIVEN multiple profiles define different node kinds
- WHEN they use the kernel
- THEN the kernel does not special-case any profile-specific kind
- AND the same traversal, patch, and validation APIs remain available

### Requirement: Tree-per-document boundary
The kernel SHALL keep a document AST as a tree even when many documents are compiled together.

#### Scenario: Workspace compilation
- GIVEN a workspace contains multiple related documents
- WHEN the compiler represents document structure
- THEN each document AST remains a tree
- AND cross-document dependencies are modeled outside the document AST

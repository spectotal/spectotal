# profile-system Specification

## Purpose
Define how Spectotal expresses domain meaning outside the kernel.
## Requirements
### Requirement: Profile-owned semantics
A profile SHALL define node kinds, an authored structural schema definition, the generated runtime schema bundle derived from that definition, parsing and any profile-local classification helpers, selectors, normalizers, and semantic validators.

#### Scenario: New profile package
- GIVEN a new semantic domain is introduced
- WHEN the profile is added
- THEN it registers an authored structural schema definition and the generated runtime schema artifacts derived from that definition
- AND it provides parsing, selectors, normalizers, and semantic validators through the profile package
- AND the kernel remains unchanged

#### Scenario: Structural validation uses the profile contract
- GIVEN a caller has selected a Spectotal profile
- WHEN canonical AST validation or patch application needs structural schema information
- THEN the profile contract exposes the generated runtime schema bundle for that profile
- AND structural validation does not reconstruct profile semantics outside the profile package

#### Scenario: Generic element tag classification remains profile-owned
- GIVEN a profile models generic HTML or custom-element node kinds
- WHEN its parsing layer needs to map a source tag into one of those structural node kinds
- THEN that classification policy is defined by the profile package
- AND kernel packages do not own tag-name semantics


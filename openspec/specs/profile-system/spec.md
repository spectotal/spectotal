# profile-system Specification

## Purpose
Define how Spectotal expresses domain meaning outside the kernel.

## Requirements

### Requirement: Profile-owned semantics
A profile SHALL define node kinds, schema, parsing, validators, selectors, and normalizers.

#### Scenario: New profile package
- GIVEN a new semantic domain is introduced
- WHEN the profile is added
- THEN it registers its schema and validators
- AND the kernel remains unchanged

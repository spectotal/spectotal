# playground-verification Specification

## Purpose
Ensure each implementation iteration remains manually verifiable through fixtures and sample API calls.

## Requirements

### Requirement: Playground fixtures for behavior changes
Every behavior-changing implementation SHALL update or add playground fixtures.

#### Scenario: Include behavior changes
- GIVEN a change modifies include composition or section assembly
- WHEN the change is implemented
- THEN playground fixtures demonstrate the new behavior
- AND manual verification can inspect expected structure

### Requirement: Manual API examples
Every behavior-changing implementation SHALL update or add manual API examples.

#### Scenario: New workspace API contract
- GIVEN a change adds or modifies a public workspace or profile API
- WHEN the change is implemented
- THEN the playground includes an example invocation
- AND the example is suitable for manual local verification

### Requirement: Iteration visibility
Playground updates SHALL happen in the same iteration as the code change they verify.

#### Scenario: Patch engine change ships
- GIVEN a patch-engine behavior change is completed
- WHEN the iteration is reviewed
- THEN corresponding fixture and example updates are already present
- AND verification does not depend on undocumented ad hoc steps

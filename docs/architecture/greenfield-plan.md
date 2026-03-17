# Greenfield plan

## Objective
Build Spectotal as a new library rather than a direct refactor of a prior implementation.

## First implementation order
1. bootstrap workspace
2. kernel AST + schema
3. workspace graph
4. source composition
5. markdown-first W3C parsing
6. patch engine
7. profile system
8. W3C normalization/validation/derivations
9. playground verification discipline

## Definition of done for phase 1
- kernel packages compile
- workspace graph contracts exist
- source composition contracts exist
- W3C profile exposes markdown-first parse surface
- playground fixtures and manual examples exist
- OpenSpec baseline is checked in
- no package violates the import direction rules

# @spectotal/profile-w3c

W3C profile package for Spectotal.

## Schema Artifacts

The W3C structural schema is authored once in `src/schema/w3c.schema-source.ts`.
That source now uses named content groups plus three generic HTML/custom element kinds:

- `flowElement`
- `phrasingElement`
- `voidElement`

Actual HTML tag names stay in `tagName`. The parsing layer classifies known tags into one of
those node kinds and defaults custom tags to `flowElement`, so the schema does not need a
separate node kind per tag.

Regenerate checked-in schema artifacts:

```bash
pnpm run schema:generate
```

Check for drift without rewriting files:

```bash
pnpm run schema:check
```

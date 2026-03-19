# @spectotal/profile-w3c

W3C profile package for Spectotal.

## Markdown Flow

```mermaid
flowchart TD
  Host["Host runtime\n(browser/server/test)"]
  Entry["Entry URL or loaded source"]
  W3CCompose["composeW3cSourceFromUrl /\ncomposeW3cSource"]
  Adapter["W3C markdown composition adapter\nparses ::include{src=...}\nand ReSpec-like data-include markers"]
  Kernel["kernel/source-compose\nresolve + load + recurse + cycle checks\nsplice fragments + provenance ancestry"]
  Composed["ComposedSource\nfragments[] + includes[]"]
  Parse["parseW3cMarkdownDocument"]
  Mdast["mdast-util-from-markdown\nper fragment"]
  Map["W3C mdast mapping\nheading / paragraph / text"]
  Html["raw HTML recovery\nparse-html-node helpers"]
  Draft["DraftDocumentAst\nflat flow with source provenance"]
  Normalize["normalizeW3cDocument"]
  Canonical["CanonicalDocumentAst\nsection hierarchy"]

  Host --> Entry
  Entry --> W3CCompose
  W3CCompose --> Adapter
  Adapter --> Kernel
  Kernel --> Composed
  Composed --> Parse
  Parse --> Mdast
  Mdast --> Map
  Mdast --> Html
  Map --> Draft
  Html --> Draft
  Draft --> Normalize
  Normalize --> Canonical
```

```mermaid
flowchart LR
  A["index.md"] -->|"content part"| K["generic composition engine"]
  A -->|"include part: conformance.md"| K
  K -->|"resolve/load"| B["conformance.md"]
  B -->|"content part"| K
  K --> C["ordered fragments"]
  C --> D["mdast parse in source order"]
  D --> E["draft heading flow"]
  E --> F["section assembly"]
```

The important boundary is:

- `@spectotal/profile-w3c` owns parser-backed include recognition and mdast-to-W3C parsing.
- `@spectotal/source-compose` stays markup-agnostic and only handles composition mechanics.
- Assembly happens after parsing, so headings are first emitted as flat draft flow and only later normalized into `section` nodes.

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

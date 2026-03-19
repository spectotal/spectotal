## Context

The repository already commits to a markdown-first W3C parsing pipeline, but the concrete implementation is still missing in the places that matter:
- `@spectotal/profile-w3c` exports a parser surface that currently returns an empty draft document.
- `@spectotal/source-compose` currently produces only a single-fragment composition and does not expand markdown include directives.
- W3C schema and type generation already exist, including generic `flowElement`, `phrasingElement`, and `voidElement` node kinds plus HTML tag classification helpers.
- W3C assembly behavior is specified separately from parsing, so section hierarchy should not be baked into the first parse pass.
- The user additionally requires source composition to be isomorphic so the same composition logic can run in browser and server runtimes.

The change needs to turn those stubs into a real markdown pipeline without violating the current package boundaries:
- kernel packages stay semantic-agnostic
- source composition happens before profile parsing and assembly
- parsing and assembly remain profile-local
- v1 stays markdown-first and does not introduce standalone HTML documents or a cross-profile parser package

## Goals / Non-Goals

**Goals:**
- Parse composed markdown into W3C draft AST nodes through the `syntax-tree` mdast ecosystem.
- Expand structural markdown includes before parsing and preserve enough provenance for later W3C assembly.
- Keep source composition isomorphic and independent from Node-only filesystem APIs.
- Support headings, paragraphs, text, structural include directives, and generic HTML/custom tags in the first parser slice.
- Recover actual tag names and attributes for raw HTML islands when W3C needs generic element nodes.
- Keep section hierarchy assembly in a later W3C normalizer rather than mixing it into the parser.
- Make the resulting behavior visible through playground fixtures, local scenarios, and manual examples.

**Non-Goals:**
- Build a shared markdown parsing package for multiple profiles.
- Support standalone `.html` entry documents or includes.
- Introduce MDX mode in this change.
- Define every W3C semantic directive in the first iteration; this change establishes the directive foundation and ships structural include handling first.
- Push heading, section, or tag semantics into kernel packages.

## Decisions

### 1. Use a profile-local mdast frontend, not a hand-rolled parser or shared kernel parser

`@spectotal/profile-w3c` will use the `syntax-tree` markdown ecosystem as its parse frontend. The main path is mdast-based markdown parsing with explicit extensions for the syntax this profile supports in v1.

Expected profile-local layout:
- `parse-document.ts`: build mdast and drive draft-node emission
- `parse-node.ts`: map mdast blocks and phrasing content into W3C draft nodes
- `parse-directive.ts`: recognize structural include directives and house the foundation for future semantic directives
- `parse-html-node.ts`: keep tag classification policy and HTML-node mapping helpers

Rationale:
- It matches the existing architecture rule that markdown parsing lives in `@spectotal/profile-w3c`.
- It keeps the kernel free of markdown syntax concerns.
- It avoids a hand-rolled markdown subset that would diverge from the stated mdast-first direction.

Alternatives considered:
- Hand-roll a line-based parser for headings and paragraphs.
  Rejected because it would immediately drift from the mdast-first architecture and make HTML/directive handling more fragile.
- Move markdown parsing into a shared kernel package.
  Rejected because only W3C currently owns this syntax-to-semantics mapping.

### 2. Keep Draft AST as flat flow and assemble sections later

The parser will emit a draft document as ordered flow, not a pre-nested section tree. Draft children will include heading, paragraph, text, generic element nodes, and directive-derived nodes in source order. W3C assembly will run afterward and transform that flow into canonical `section` structure.

Rationale:
- It aligns with the existing split between parsing and profile assembly.
- It lets include-expanded content participate in one combined flow before hierarchy decisions are made.
- It prevents the parser from hardcoding section stack semantics that belong to W3C assembly.

Alternatives considered:
- Build `section` nodes directly during parsing.
  Rejected because it collapses parsing and assembly into one stage and makes include-aware rebasing harder to reason about.

### 3. Treat raw HTML as HTML islands and use selective raw-HTML parsing only where needed

The mdast path remains primary. When mdast produces raw HTML fragments, W3C will selectively parse those fragments into actual element/tag structures only when it needs generic element nodes. Those parsed tags will map through the existing W3C HTML classification policy into `flowElement`, `phrasingElement`, or `voidElement`.

This change does not redefine CommonMark to mean "arbitrary raw HTML blocks can always contain parsed markdown children." Structural markdown content will continue to come from markdown syntax. Raw HTML handling is for recovering element structure, not for inventing a new markdown-in-HTML dialect.

Rationale:
- It preserves mdast as the main parser contract while still making raw HTML useful for generic W3C element nodes.
- It avoids promising behavior that plain markdown does not model consistently.
- It fits the current W3C schema, which already has generic element families instead of per-tag node kinds.

Alternatives considered:
- Ignore raw HTML entirely in the first parser.
  Rejected because the W3C schema and profile policy already reserve space for generic HTML/custom tags.
- Make raw HTML blocks recursively parse markdown children by default.
  Rejected because it would create a custom dialect boundary that is larger than this change.
- Adopt MDX JSX now to model markdown-owning tags.
  Rejected for v1 because it changes the input mode and adds a larger syntax commitment than needed for the initial W3C parser.

### 4. Extend provenance through source composition and AST nodes instead of relying on side channels

Source composition will expand structural includes into ordered fragments and preserve include ancestry on those fragments. The AST provenance contract will be extended so draft and canonical nodes can carry both original source position and include ancestry in a kernel-agnostic way.

The parser will stamp draft nodes with source provenance as it emits them. W3C assembly will consume only the draft AST and its provenance, not a hidden side channel or an ad hoc synthetic string encoding.

Rationale:
- The current normalizer contract only receives AST plus plan, so assembly needs provenance on the nodes it sees.
- Provenance is kernel-agnostic data; heading or section meaning remains profile-local.
- It keeps later diagnostics and canonical nodes tied to actual authored locations instead of transient parser state.

Alternatives considered:
- Pass `ComposedSource` directly into normalizers and keep AST provenance unchanged.
  Rejected because it couples later stages to external parser state and leaves canonical AST provenance underspecified.
- Encode include ancestry in free-form synthetic strings.
  Rejected because it is brittle and not machine-readable.

### 5. Keep ownership boundaries narrow: source composition in the kernel, syntax/assembly in W3C

`packages/kernel/source-compose` will own markdown include expansion, fragment ordering, and provenance preservation. `packages/profiles/profile-w3c` will own mdast parsing, directive recognition, raw HTML handling, tag classification, and section assembly. `packages/kernel/ast` will own only the provenance shape needed to carry source ancestry.

Workspace config, document config, workspace graph, and derivations remain unchanged.

Rationale:
- It preserves the intended separation between generic composition and profile semantics.
- It lets later profiles reuse composition behavior without inheriting W3C structure rules.
- It contains new parser dependencies inside the W3C profile package.

Alternatives considered:
- Let W3C parse include directives directly.
  Rejected because source composition is already the defined pre-profile stage.
- Move provenance-chain logic into W3C-only draft fields.
  Rejected because provenance is not W3C-specific and belongs in the generic AST contract.

### 6. Make source composition pure and loader-driven so it runs in browser and server environments

The composition core will stay inside `packages/kernel/source-compose`, but it will not assume direct filesystem access. Instead, composition will operate on caller-provided source content and/or a runtime-agnostic async loader/resolver contract that can be implemented in browser, server, tests, or other hosts.

Resolution inside the composition core will be `URL`-object based rather than path-string based. Hosts will resolve include targets relative to a parent `URL` and asynchronously return source content plus any normalized document `URL`. The composition core must not depend on Node-only builtins such as `fs` or `path`; host-specific document access belongs at the call site, not in the composition algorithm itself.

Planned host contract shape:

```ts
export interface LoadedSource {
  readonly url: URL;
  readonly content: string;
}

export type SourceLoader = (url: URL) => Promise<LoadedSource>;
export type IncludeResolver = (target: string, from: URL) => Promise<URL>;

export interface CompositionHost {
  readonly resolve: IncludeResolver;
  readonly load: SourceLoader;
}
```

The composition entrypoint may still offer convenience wrappers for already-loaded single-document content, but recursive include expansion will standardize on this async host contract.

Rationale:
- It satisfies the explicit requirement that composition run in both browser and server environments.
- Async loading matches browser and remote-host access patterns without forcing a second contract later.
- `URL`-object based resolution makes relative resolution rules explicit and avoids leaking platform-specific path semantics into the kernel.
- A concrete host interface keeps browser and server integrations aligned and minimizes ambiguity during implementation.
- It keeps composition reusable for playground, browser tooling, and future hosted editors.
- It preserves the kernel/profile boundary because runtime access concerns remain outside profile semantics.

Alternatives considered:
- Implement composition with direct Node filesystem access and add a separate browser adapter later.
  Rejected because it would make the primary contract Node-shaped and force a second composition path.
- Use synchronous path-string based resolution.
  Rejected because it bakes host-specific path assumptions into the kernel contract and makes browser or remote source loading harder to represent.
- Move composition into the browser-facing app layer.
  Rejected because include expansion is part of the kernel pipeline contract, not app-specific behavior.

## Risks / Trade-offs

- [Raw HTML behavior is surprising in markdown] → Restrict v1 semantics to explicit HTML-island handling, document the boundary, and add focused fixtures for inline and block HTML cases.
- [Provenance changes ripple into AST consumers] → Keep the provenance extension additive and update existing callers in the same change.
- [Include composition plus parser mapping increases cross-package coordination] → Keep source composition generic and constrain profile-specific logic to W3C parsing and assembly.
- [Browser-safe composition limits convenient filesystem assumptions] → Use an injected loader/resolver contract and keep host-specific IO outside the composition core.
- [Directive support can sprawl into many W3C semantic blocks] → Ship structural include directives first and leave richer semantic containers for follow-up changes.
- [New parsing dependencies increase footprint] → Keep them profile-local and avoid introducing a shared parser package until reuse is real.

## Migration Plan

1. Extend `@spectotal/ast` provenance types to carry include ancestry in a kernel-agnostic way.
2. Extend `@spectotal/source-compose` to expand structural markdown includes into ordered fragments with provenance metadata through an isomorphic async loader/resolver contract based on `URL` objects.
3. Add mdast and selective raw-HTML parsing dependencies to `@spectotal/profile-w3c`.
4. Implement W3C parse helpers for markdown nodes, include directives, and raw HTML mapping.
5. Implement W3C assembly/normalization from draft flow into canonical section structure.
6. Update playground fixtures, examples, and local scenarios for single-document, include, and HTML/container behavior.
7. Verify package builds and playground parsing examples against the new behavior.

Rollback:
- Revert `@spectotal/profile-w3c` to the existing stub parser and remove the new dependencies if the parser boundary proves unstable.
- Revert source-composition and provenance changes together if include ancestry is not yet coherent enough for assembly.

## Open Questions

- Should the first change ship only structural include directives, or also a first semantic container such as `note` to validate the directive foundation end to end?
- How rich should include ancestry be in AST provenance: `URL` lineage only, or `URL` plus include-site line/column?
- Should raw HTML fixtures cover only generic elements in this change, or also prove how headings behave when nested inside generic flow containers?

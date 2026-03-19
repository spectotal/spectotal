# parse

Suggested internal layout for v1:

- `parse-document.ts`
- `parse-node.ts`
- `parse-include.ts`
- `parse-html-node.ts`
- `parse-directive.ts`

These stay inside `@spectotal/profile-w3c` until another profile needs the same markdown parsing layer.

`parse-html-node.ts` now owns the generic HTML tag classification used by the schema:
void tags map to `voidElement`, phrasing tags map to `phrasingElement`, and everything else
defaults to `flowElement`.

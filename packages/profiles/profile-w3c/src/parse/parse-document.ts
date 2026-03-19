import type {
  AstNode,
  DraftDocumentAst,
  SourceProvenance,
} from "@spectotal/ast";
import type { ProfileParseContext } from "@spectotal/profile-core";
import type { SourceFragment } from "@spectotal/source-compose";
import { fromHtml } from "hast-util-from-html";
import { fromMarkdown } from "mdast-util-from-markdown";
import {
  classifyW3cHtmlTag,
  normalizeHtmlTagName,
  type W3cHtmlNodeKind,
} from "./parse-html-node.js";

interface PositionPoint {
  readonly line: number;
  readonly column: number;
}

interface Position {
  readonly start: PositionPoint;
}

export interface MdastNode {
  readonly type: string;
  readonly value?: string;
  readonly depth?: number;
  readonly url?: string;
  readonly title?: string | null;
  readonly ordered?: boolean;
  readonly children?: readonly MdastNode[];
  readonly position?: Position;
}

interface HastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly HastNode[];
  readonly position?: Position;
}

interface HastRoot {
  readonly type: "root";
  readonly children?: readonly HastNode[];
}

interface InlineHtmlConsumption {
  readonly node: AstNode;
  readonly nextIndex: number;
}

export interface W3cMarkdownParseResult {
  readonly mdast?: MdastNode;
  readonly draft: DraftDocumentAst;
  readonly diagnostics: readonly string[];
}

const HTML_OPEN_TAG_PATTERN = /^<([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*)?>$/;
const HTML_CLOSE_TAG_PATTERN = /^<\/([A-Za-z][A-Za-z0-9:-]*)\s*>$/;
const HTML_SELF_CLOSING_TAG_PATTERN =
  /^<([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*)?\/\s*>$/;

function sourceProvenance(
  fragment: SourceFragment,
  position?: PositionPoint,
): SourceProvenance {
  const line =
    position && fragment.startLine !== undefined
      ? fragment.startLine + position.line - 1
      : (position?.line ?? fragment.startLine);
  const column = position?.column;

  return {
    kind: "source",
    uri: fragment.uri,
    includeAncestors: fragment.provenanceChain ?? [],
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
  };
}

function normalizeHtmlAttributes(
  properties?: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string | boolean>> | undefined {
  if (!properties) return undefined;

  const normalizedEntries = Object.entries(properties)
    .map(([key, value]) => {
      if (value === null || value === undefined) return undefined;
      const normalizedKey = key === "className" ? "class" : key;

      if (typeof value === "string" || typeof value === "boolean") {
        return [normalizedKey, value] as const;
      }

      if (Array.isArray(value)) {
        return [normalizedKey, value.map(String).join(" ")] as const;
      }

      if (typeof value === "number") {
        return [normalizedKey, String(value)] as const;
      }

      return [normalizedKey, String(value)] as const;
    })
    .filter((entry): entry is readonly [string, string | boolean] =>
      Boolean(entry),
    );

  if (normalizedEntries.length === 0) return undefined;
  return Object.fromEntries(normalizedEntries);
}

function textNode(value: string, provenance: SourceProvenance): AstNode {
  return {
    kind: "text",
    value,
    provenance,
  };
}

function paragraphNode(
  children: readonly AstNode[],
  provenance: SourceProvenance,
): AstNode {
  return {
    kind: "paragraph",
    provenance,
    children,
  };
}

function headingNode(
  level: number,
  children: readonly AstNode[],
  provenance: SourceProvenance,
): AstNode {
  return {
    kind: "heading",
    level,
    provenance,
    children,
  };
}

function elementNode(
  kind: W3cHtmlNodeKind,
  tagName: string,
  provenance: SourceProvenance,
  attributes?: Readonly<Record<string, string | boolean>>,
  children?: readonly AstNode[],
): AstNode {
  return {
    kind,
    tagName,
    provenance,
    ...(attributes ? { attributes } : {}),
    ...(children ? { children } : {}),
  };
}

function parseHtmlElement(value: string): HastNode | undefined {
  const root = fromHtml(value, { fragment: true }) as HastRoot;
  const [firstChild] = root.children ?? [];
  return firstChild;
}

function parseOpeningHtmlTag(value: string): HastNode | undefined {
  if (
    !HTML_OPEN_TAG_PATTERN.test(value) &&
    !HTML_SELF_CLOSING_TAG_PATTERN.test(value)
  ) {
    return undefined;
  }

  return parseHtmlElement(value);
}

function parseClosingHtmlTag(value: string): string | undefined {
  return HTML_CLOSE_TAG_PATTERN.exec(value)?.[1]
    ? normalizeHtmlTagName(HTML_CLOSE_TAG_PATTERN.exec(value)![1])
    : undefined;
}

function parseOpeningHtmlTagName(value: string): string | undefined {
  const selfClosingTag = HTML_SELF_CLOSING_TAG_PATTERN.exec(value)?.[1];

  if (selfClosingTag) return normalizeHtmlTagName(selfClosingTag);

  const openingTag = HTML_OPEN_TAG_PATTERN.exec(value)?.[1];
  return openingTag ? normalizeHtmlTagName(openingTag) : undefined;
}

function mapHastPhrasingNode(
  node: HastNode,
  fragment: SourceFragment,
  diagnostics: string[],
): AstNode | undefined {
  if (node.type === "text") {
    if (!node.value || node.value.trim().length === 0) return undefined;
    return textNode(
      node.value,
      sourceProvenance(fragment, node.position?.start),
    );
  }

  if (node.type !== "element" || !node.tagName) return undefined;

  const tagName = normalizeHtmlTagName(node.tagName);
  const kind = classifyW3cHtmlTag(tagName);

  if (kind !== "phrasingElement") {
    diagnostics.push(
      `Inline HTML tag <${tagName}> is not supported in phrasing context with the current W3C schema.`,
    );
    return undefined;
  }

  const children = (node.children ?? [])
    .map((child) => mapHastPhrasingNode(child, fragment, diagnostics))
    .filter((child): child is AstNode => Boolean(child));

  return elementNode(
    "phrasingElement",
    tagName,
    sourceProvenance(fragment, node.position?.start),
    normalizeHtmlAttributes(node.properties),
    children,
  );
}

function flushBufferedPhrasingAsParagraph(
  buffered: AstNode[],
  fragment: SourceFragment,
  paragraphProvenance?: SourceProvenance,
  nodes?: AstNode[],
): AstNode[] {
  if (buffered.length === 0) return nodes ?? [];

  const nextNodes = nodes ?? [];
  nextNodes.push(
    paragraphNode(
      [...buffered],
      paragraphProvenance ?? sourceProvenance(fragment),
    ),
  );
  buffered.length = 0;
  return nextNodes;
}

function mapHastFlowNodes(
  nodes: readonly HastNode[],
  fragment: SourceFragment,
  diagnostics: string[],
): readonly AstNode[] {
  const mapped: AstNode[] = [];
  const phrasingBuffer: AstNode[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      if (!node.value || node.value.trim().length === 0) continue;
      phrasingBuffer.push(
        textNode(node.value, sourceProvenance(fragment, node.position?.start)),
      );
      continue;
    }

    if (node.type !== "element" || !node.tagName) continue;

    const tagName = normalizeHtmlTagName(node.tagName);
    const kind = classifyW3cHtmlTag(tagName);
    const provenance = sourceProvenance(fragment, node.position?.start);
    const attributes = normalizeHtmlAttributes(node.properties);

    if (kind === "phrasingElement") {
      const phrasingNode = mapHastPhrasingNode(node, fragment, diagnostics);

      if (phrasingNode) phrasingBuffer.push(phrasingNode);
      continue;
    }

    flushBufferedPhrasingAsParagraph(
      phrasingBuffer,
      fragment,
      provenance,
      mapped,
    );

    if (kind === "voidElement") {
      mapped.push(elementNode(kind, tagName, provenance, attributes));
      continue;
    }

    mapped.push(
      elementNode(
        kind,
        tagName,
        provenance,
        attributes,
        mapHastFlowNodes(node.children ?? [], fragment, diagnostics),
      ),
    );
  }

  flushBufferedPhrasingAsParagraph(phrasingBuffer, fragment, undefined, mapped);
  return mapped;
}

function parseRawHtmlAsFlowNodes(
  value: string,
  fragment: SourceFragment,
  diagnostics: string[],
): readonly AstNode[] {
  const root = fromHtml(value, { fragment: true }) as HastRoot;
  return mapHastFlowNodes(root.children ?? [], fragment, diagnostics);
}

function parseStandaloneInlineHtml(
  value: string,
  fragment: SourceFragment,
  diagnostics: string[],
): readonly AstNode[] {
  const root = fromHtml(value, { fragment: true }) as HastRoot;
  return (root.children ?? [])
    .map((child) => mapHastPhrasingNode(child, fragment, diagnostics))
    .filter((child): child is AstNode => Boolean(child));
}

function consumeInlineHtmlContainer(
  children: readonly MdastNode[],
  startIndex: number,
  fragment: SourceFragment,
  diagnostics: string[],
): InlineHtmlConsumption | undefined {
  const openingValue = children[startIndex]?.value;

  if (!openingValue) return undefined;

  const tagName = parseOpeningHtmlTagName(openingValue);

  if (!tagName) return undefined;

  const openingElement = parseOpeningHtmlTag(openingValue);

  if (!openingElement || classifyW3cHtmlTag(tagName) !== "phrasingElement") {
    return undefined;
  }

  let depth = 1;

  for (let index = startIndex + 1; index < children.length; index += 1) {
    const node = children[index];

    if (node?.type !== "html" || !node.value) continue;

    if (parseOpeningHtmlTagName(node.value) === tagName) {
      depth += 1;
      continue;
    }

    if (parseClosingHtmlTag(node.value) !== tagName) continue;

    depth -= 1;

    if (depth !== 0) continue;

    return {
      node: elementNode(
        "phrasingElement",
        tagName,
        sourceProvenance(fragment, children[startIndex]?.position?.start),
        normalizeHtmlAttributes(openingElement.properties),
        mapPhrasingNodes(
          children.slice(startIndex + 1, index),
          fragment,
          diagnostics,
        ),
      ),
      nextIndex: index,
    };
  }

  return undefined;
}

function mapPhrasingNodes(
  children: readonly MdastNode[],
  fragment: SourceFragment,
  diagnostics: string[],
): readonly AstNode[] {
  const mapped: AstNode[] = [];

  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];

    if (!node) continue;

    switch (node.type) {
      case "text":
        if (node.value) {
          mapped.push(
            textNode(
              node.value,
              sourceProvenance(fragment, node.position?.start),
            ),
          );
        }
        break;

      case "emphasis":
        mapped.push(
          elementNode(
            "phrasingElement",
            "em",
            sourceProvenance(fragment, node.position?.start),
            undefined,
            mapPhrasingNodes(node.children ?? [], fragment, diagnostics),
          ),
        );
        break;

      case "strong":
        mapped.push(
          elementNode(
            "phrasingElement",
            "strong",
            sourceProvenance(fragment, node.position?.start),
            undefined,
            mapPhrasingNodes(node.children ?? [], fragment, diagnostics),
          ),
        );
        break;

      case "inlineCode":
        mapped.push(
          elementNode(
            "phrasingElement",
            "code",
            sourceProvenance(fragment, node.position?.start),
            undefined,
            node.value
              ? [
                  textNode(
                    node.value,
                    sourceProvenance(fragment, node.position?.start),
                  ),
                ]
              : [],
          ),
        );
        break;

      case "link":
        mapped.push(
          elementNode(
            "phrasingElement",
            "a",
            sourceProvenance(fragment, node.position?.start),
            node.url ? { href: node.url } : undefined,
            mapPhrasingNodes(node.children ?? [], fragment, diagnostics),
          ),
        );
        break;

      case "break":
        mapped.push(
          textNode("\n", sourceProvenance(fragment, node.position?.start)),
        );
        break;

      case "html": {
        const container = consumeInlineHtmlContainer(
          children,
          index,
          fragment,
          diagnostics,
        );

        if (container) {
          mapped.push(container.node);
          index = container.nextIndex;
          break;
        }

        mapped.push(
          ...parseStandaloneInlineHtml(node.value ?? "", fragment, diagnostics),
        );
        break;
      }

      default:
        diagnostics.push(`Unsupported phrasing mdast node type: ${node.type}`);
        break;
    }
  }

  return mapped;
}

function mapListItem(
  node: MdastNode,
  fragment: SourceFragment,
  diagnostics: string[],
): AstNode {
  return elementNode(
    "flowElement",
    "li",
    sourceProvenance(fragment, node.position?.start),
    undefined,
    mapBlockNodes(node.children ?? [], fragment, diagnostics),
  );
}

function mapBlockNodes(
  nodes: readonly MdastNode[],
  fragment: SourceFragment,
  diagnostics: string[],
): readonly AstNode[] {
  const mapped: AstNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "heading": {
        const children = mapPhrasingNodes(
          node.children ?? [],
          fragment,
          diagnostics,
        );

        if (children.length === 0) {
          diagnostics.push("Encountered heading without phrasing children.");
          break;
        }

        mapped.push(
          headingNode(
            node.depth ?? 1,
            children,
            sourceProvenance(fragment, node.position?.start),
          ),
        );
        break;
      }

      case "paragraph": {
        const children = mapPhrasingNodes(
          node.children ?? [],
          fragment,
          diagnostics,
        );

        if (children.length === 0) {
          diagnostics.push("Encountered paragraph without phrasing children.");
          break;
        }

        mapped.push(
          paragraphNode(
            children,
            sourceProvenance(fragment, node.position?.start),
          ),
        );
        break;
      }

      case "html":
        mapped.push(
          ...parseRawHtmlAsFlowNodes(node.value ?? "", fragment, diagnostics),
        );
        break;

      case "blockquote":
        mapped.push(
          elementNode(
            "flowElement",
            "blockquote",
            sourceProvenance(fragment, node.position?.start),
            undefined,
            mapBlockNodes(node.children ?? [], fragment, diagnostics),
          ),
        );
        break;

      case "code":
        mapped.push(
          elementNode(
            "flowElement",
            "pre",
            sourceProvenance(fragment, node.position?.start),
            undefined,
            [
              paragraphNode(
                [
                  elementNode(
                    "phrasingElement",
                    "code",
                    sourceProvenance(fragment, node.position?.start),
                    undefined,
                    node.value
                      ? [
                          textNode(
                            node.value,
                            sourceProvenance(fragment, node.position?.start),
                          ),
                        ]
                      : [],
                  ),
                ],
                sourceProvenance(fragment, node.position?.start),
              ),
            ],
          ),
        );
        break;

      case "list":
        mapped.push(
          elementNode(
            "flowElement",
            node.ordered ? "ol" : "ul",
            sourceProvenance(fragment, node.position?.start),
            undefined,
            (node.children ?? []).map((child) =>
              mapListItem(child, fragment, diagnostics),
            ),
          ),
        );
        break;

      case "thematicBreak":
        mapped.push(
          elementNode(
            "voidElement",
            "hr",
            sourceProvenance(fragment, node.position?.start),
          ),
        );
        break;

      default:
        diagnostics.push(`Unsupported block mdast node type: ${node.type}`);
        break;
    }
  }

  return mapped;
}

export async function parseW3cMarkdown(
  context: ProfileParseContext,
): Promise<W3cMarkdownParseResult> {
  const diagnostics: string[] = [];
  const mdastChildren: MdastNode[] = [];
  const draftChildren: AstNode[] = [];

  for (const fragment of context.source.fragments) {
    const root = fromMarkdown(fragment.content) as MdastNode;
    const children = root.children ?? [];

    mdastChildren.push(...children);
    draftChildren.push(...mapBlockNodes(children, fragment, diagnostics));
  }

  return {
    mdast: {
      type: "root",
      children: mdastChildren,
    },
    draft: {
      profileId: context.plan.profileId,
      root: {
        kind: "document",
        provenance: {
          kind: "source",
          uri: context.source.entryUri,
          includeAncestors: [],
        },
        children: draftChildren,
      },
    },
    diagnostics,
  };
}

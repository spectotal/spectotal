export type W3cHtmlNodeKind = "flowElement" | "phrasingElement" | "voidElement";

const VOID_HTML_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const PHRASING_HTML_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "button",
  "cite",
  "code",
  "data",
  "datalist",
  "del",
  "dfn",
  "em",
  "i",
  "ins",
  "kbd",
  "label",
  "map",
  "mark",
  "meter",
  "noscript",
  "object",
  "output",
  "picture",
  "progress",
  "q",
  "ruby",
  "s",
  "samp",
  "select",
  "slot",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "template",
  "textarea",
  "time",
  "u",
  "var",
  "video",
]);

export function normalizeHtmlTagName(tagName: string): string {
  return tagName.trim().toLowerCase();
}

export function classifyW3cHtmlTag(tagName: string): W3cHtmlNodeKind {
  const normalizedTagName = normalizeHtmlTagName(tagName);

  if (VOID_HTML_TAGS.has(normalizedTagName)) return "voidElement";
  if (PHRASING_HTML_TAGS.has(normalizedTagName)) return "phrasingElement";
  return "flowElement";
}

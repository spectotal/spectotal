import { directiveFromMarkdown } from "mdast-util-directive";
import { fromMarkdown } from "mdast-util-from-markdown";
import { directive } from "micromark-extension-directive";

export interface PositionPoint {
  readonly line: number;
  readonly column: number;
  readonly offset?: number;
}

export interface Position {
  readonly start: PositionPoint;
  readonly end: PositionPoint;
}

export interface MdastNode {
  readonly type: string;
  readonly value?: string;
  readonly depth?: number;
  readonly url?: string;
  readonly title?: string | null;
  readonly ordered?: boolean;
  readonly name?: string;
  readonly attributes?: Readonly<Record<string, string | null | undefined>>;
  readonly children?: readonly MdastNode[];
  readonly position?: Position;
}

export const W3C_MARKDOWN_FRONTEND_OPTIONS = {
  extensions: [directive()],
  mdastExtensions: [directiveFromMarkdown()],
};

export function parseW3cMarkdownRoot(content: string): MdastNode {
  return fromMarkdown(content, W3C_MARKDOWN_FRONTEND_OPTIONS) as MdastNode;
}

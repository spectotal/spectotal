// Generated file. Do not edit directly.
// Regenerate with the profile schema generation script.

import type { AstNode } from "@spectotal/ast";

export interface W3cDocumentNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "document";
  readonly children: readonly (W3cHeadingNode | W3cSectionNode | W3cParagraphNode | W3cNoteNode | W3cExampleNode | W3cIssueNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cSectionNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "section";
  readonly children: readonly (W3cHeadingNode | W3cSectionNode | W3cParagraphNode | W3cNoteNode | W3cExampleNode | W3cIssueNode | W3cRequirementNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cHeadingNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "heading";
  readonly level: number;
  readonly children: readonly (W3cTextNode | W3cPhrasingElementNode)[];
}

export interface W3cParagraphNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "paragraph";
  readonly children: readonly (W3cTextNode | W3cPhrasingElementNode)[];
}

export interface W3cTextNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "text";
  readonly value: string;
  readonly children?: never;
}

export interface W3cRequirementNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "requirement";
  readonly requirementId: string;
  readonly children: readonly (W3cParagraphNode | W3cNoteNode | W3cExampleNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cNoteNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "note";
  readonly tone?: string;
  readonly children: readonly (W3cParagraphNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cExampleNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "example";
  readonly children: readonly (W3cHeadingNode | W3cParagraphNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cIssueNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "issue";
  readonly issueId: string;
  readonly children: readonly (W3cHeadingNode | W3cParagraphNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cFlowElementNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "flowElement";
  readonly tagName: string;
  readonly attributes?: Readonly<Record<string, string | boolean>>;
  readonly children: readonly (W3cHeadingNode | W3cSectionNode | W3cParagraphNode | W3cNoteNode | W3cExampleNode | W3cIssueNode | W3cRequirementNode | W3cFlowElementNode | W3cVoidElementNode)[];
}

export interface W3cPhrasingElementNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "phrasingElement";
  readonly tagName: string;
  readonly attributes?: Readonly<Record<string, string | boolean>>;
  readonly children: readonly (W3cTextNode | W3cPhrasingElementNode)[];
}

export interface W3cVoidElementNode extends Omit<AstNode, "kind" | "children"> {
  readonly kind: "voidElement";
  readonly tagName: string;
  readonly attributes?: Readonly<Record<string, string | boolean>>;
  readonly children?: never;
}

export type W3cNode = W3cDocumentNode | W3cSectionNode | W3cHeadingNode | W3cParagraphNode | W3cTextNode | W3cRequirementNode | W3cNoteNode | W3cExampleNode | W3cIssueNode | W3cFlowElementNode | W3cPhrasingElementNode | W3cVoidElementNode;
export type W3cNodeKind = W3cNode["kind"];

import type { AstNode } from "@spectotal/ast";

export type NodeKind = string;

export interface ChildSchema {
  readonly accepts: readonly NodeKind[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface FieldSchema {
  readonly type: "string" | "number" | "boolean";
  readonly required?: boolean;
}

export interface NodeSchema {
  readonly kind: NodeKind;
  readonly fields?: Readonly<Record<string, FieldSchema>>;
  readonly children?: ChildSchema;
}

export interface ProfileSchema {
  readonly profileId: string;
  readonly rootKind: NodeKind;
  readonly nodes: Readonly<Record<NodeKind, NodeSchema>>;
}

export function getNodeSchema(profile: ProfileSchema, kind: NodeKind): NodeSchema | undefined {
  return profile.nodes[kind];
}

export function acceptsChild(schema: NodeSchema, child: Pick<AstNode, "kind">): boolean {
  return schema.children?.accepts.includes(child.kind) === true;
}
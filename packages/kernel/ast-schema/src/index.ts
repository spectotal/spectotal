import type { AstNode } from "@spectotal/ast";

export type SlotName = string;
export type NodeKind = string;

export interface SlotSchema {
  readonly name: SlotName;
  readonly accepts: readonly NodeKind[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface NodeSchema {
  readonly kind: NodeKind;
  readonly slots?: readonly SlotSchema[];
  readonly requiredProps?: readonly string[];
}

export interface ProfileSchema {
  readonly profileId: string;
  readonly nodes: readonly NodeSchema[];
}

export function acceptsChild(schema: NodeSchema, slotName: string, child: AstNode): boolean {
  const slot = (schema.slots ?? []).find((entry) => entry.name === slotName);
  return !!slot && slot.accepts.includes(child.kind);
}

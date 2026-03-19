import {
  normalizeProfileSchemaSource,
  type AuthoredProfileSchema,
  type FieldSchema,
  type NodeSchemaMap,
  type NormalizedProfileSchemaSource,
  type PatchRule,
  type PatchRuleTable,
} from "./runtime.js";

export interface RenderProfileArtifactsOptions {
  readonly source: AuthoredProfileSchema;
  readonly baseName: string;
  readonly typePrefix: string;
}

export interface RenderedProfileArtifacts {
  readonly metadata: string;
  readonly rules: string;
  readonly validators: string;
  readonly schema: string;
  readonly types: string;
}

const GENERATED_HEADER =
  "// Generated file. Do not edit directly.\n" +
  "// Regenerate with the profile schema generation script.\n\n";

function toPascalCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

function indent(value: string, level: number): string {
  const prefix = "  ".repeat(level);
  return value
    .split("\n")
    .map((line) => (line.length === 0 ? line : `${prefix}${line}`))
    .join("\n");
}

function renderValue(value: unknown, level = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((entry) => indent(`${renderValue(entry, level + 1)},`, level + 1)).join("\n")}\n${"  ".repeat(level)}]`;
  }

  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "null";

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";

    return `{\n${entries
      .map(([key, entryValue]) =>
        indent(
          `${JSON.stringify(key)}: ${renderValue(entryValue, level + 1)},`,
          level + 1,
        ),
      )
      .join("\n")}\n${"  ".repeat(level)}}`;
  }

  return "undefined";
}

function createPatchRules(nodeSchemas: NodeSchemaMap): PatchRuleTable {
  return Object.fromEntries(
    Object.entries(nodeSchemas).map(([kind, nodeSchema]) => {
      if (!nodeSchema.children) return [kind, null];

      const patchRule: PatchRule = {
        accepts: new Set(nodeSchema.children.accepts),
        ...(nodeSchema.children.minItems === undefined
          ? {}
          : { minItems: nodeSchema.children.minItems }),
        ...(nodeSchema.children.maxItems === undefined
          ? {}
          : { maxItems: nodeSchema.children.maxItems }),
      };

      return [kind, patchRule];
    }),
  );
}

function renderMetadataModule(
  normalized: NormalizedProfileSchemaSource,
  baseName: string,
): string {
  return (
    GENERATED_HEADER +
    'import type { NodeSchemaMap } from "@spectotal/ast-schema";\n\n' +
    `export const ${baseName}ProfileId = ${JSON.stringify(normalized.profileId)};\n` +
    `export const ${baseName}RootKind = ${JSON.stringify(normalized.rootKind)};\n\n` +
    `export const ${baseName}NodeSchemas = ${renderValue(normalized.nodes)} as const satisfies NodeSchemaMap;\n`
  );
}

function renderRulesModule(
  nodeSchemas: NodeSchemaMap,
  baseName: string,
): string {
  const rules = createPatchRules(nodeSchemas);
  const ruleLines = Object.entries(rules).map(([kind, rule]) => {
    if (!rule) return `  ${JSON.stringify(kind)}: null,`;

    const details = [
      `accepts: new Set(${renderValue(nodeSchemas[kind]?.children?.accepts ?? [], 1)})`,
      ...(rule.minItems === undefined
        ? []
        : [`minItems: ${String(rule.minItems)}`]),
      ...(rule.maxItems === undefined
        ? []
        : [`maxItems: ${String(rule.maxItems)}`]),
    ];

    return `  ${JSON.stringify(kind)}: {\n${details.map((line) => `    ${line},`).join("\n")}\n  },`;
  });

  return (
    GENERATED_HEADER +
    'import type { PatchRuleTable } from "@spectotal/ast-schema";\n\n' +
    `export const ${baseName}PatchRulesByKind: PatchRuleTable = {\n${ruleLines.join("\n")}\n};\n`
  );
}

function renderValidatorsModule(baseName: string, typePrefix: string): string {
  return (
    GENERATED_HEADER +
    'import { createProfileSchemaValidators, type ProfileSchemaValidators } from "@spectotal/ast-schema";\n' +
    `import { ${baseName}NodeSchemas, ${baseName}ProfileId, ${baseName}RootKind } from "./${baseName}.metadata.generated.js";\n\n` +
    `export const ${baseName}Validators: ProfileSchemaValidators = createProfileSchemaValidators({\n` +
    `  profileId: ${baseName}ProfileId,\n` +
    `  rootKind: ${baseName}RootKind,\n` +
    `  nodes: ${baseName}NodeSchemas,\n` +
    "});\n\n" +
    `export const validate${typePrefix}Node = ${baseName}Validators.node;\n` +
    `export const validate${typePrefix}Root = ${baseName}Validators.root;\n` +
    `export const validate${typePrefix}Document = ${baseName}Validators.document;\n`
  );
}

function renderSchemaModule(
  normalized: NormalizedProfileSchemaSource,
  baseName: string,
): string {
  return (
    GENERATED_HEADER +
    'import type { ProfileSchema } from "@spectotal/ast-schema";\n' +
    `import { ${baseName}NodeSchemas, ${baseName}ProfileId, ${baseName}RootKind } from "./${baseName}.metadata.generated.js";\n` +
    `import { ${baseName}PatchRulesByKind } from "./${baseName}.rules.generated.js";\n` +
    `import { ${baseName}Validators } from "./${baseName}.validators.generated.js";\n\n` +
    `export const ${baseName}Schema: ProfileSchema = {\n` +
    `  profileId: ${baseName}ProfileId,\n` +
    `  rootKind: ${baseName}RootKind,\n` +
    `  nodes: ${baseName}NodeSchemas,\n` +
    `  patchRulesByKind: ${baseName}PatchRulesByKind,\n` +
    `  validators: ${baseName}Validators,\n` +
    "};\n"
  );
}

function renderTypeProperty(
  name: string,
  type: string,
  optional = false,
): string {
  return `  readonly ${name}${optional ? "?" : ""}: ${type};`;
}

function renderFieldType(fieldSchema: FieldSchema): string {
  if (fieldSchema.type !== "record") return fieldSchema.type;

  const valueType =
    fieldSchema.valueTypes.length === 1
      ? fieldSchema.valueTypes[0]!
      : fieldSchema.valueTypes.join(" | ");

  return `Readonly<Record<string, ${valueType}>>`;
}

function renderChildType(
  nodeKinds: readonly string[],
  typePrefix: string,
): string | undefined {
  if (nodeKinds.length === 0) return undefined;
  if (nodeKinds.length === 1)
    return `readonly ${typePrefix}${toPascalCase(nodeKinds[0]!)}Node[]`;

  return `readonly (${nodeKinds
    .map((childKind) => `${typePrefix}${toPascalCase(childKind)}Node`)
    .join(" | ")})[]`;
}

function renderTypesModule(
  nodeSchemas: NodeSchemaMap,
  typePrefix: string,
): string {
  const kinds = Object.keys(nodeSchemas);
  const interfaceBlocks = kinds.map((kind) => {
    const nodeSchema = nodeSchemas[kind]!;
    const interfaceName = `${typePrefix}${toPascalCase(kind)}Node`;
    const childType = renderChildType(
      nodeSchema.children?.accepts ?? [],
      typePrefix,
    );
    const fieldLines = Object.entries(nodeSchema.fields ?? {}).map(
      ([fieldName, fieldSchema]) =>
        renderTypeProperty(
          fieldName,
          renderFieldType(fieldSchema),
          fieldSchema.required !== true,
        ),
    );

    const lines = [
      `export interface ${interfaceName} extends Omit<AstNode, "kind" | "children"> {`,
      renderTypeProperty("kind", JSON.stringify(kind)),
      ...fieldLines,
      childType === undefined
        ? renderTypeProperty("children", "never", true)
        : renderTypeProperty("children", childType),
      "}",
    ];

    return lines.join("\n");
  });

  const unionName = `${typePrefix}Node`;
  const unionMembers = kinds
    .map((kind) => `${typePrefix}${toPascalCase(kind)}Node`)
    .join(" | ");

  return (
    GENERATED_HEADER +
    'import type { AstNode } from "@spectotal/ast";\n\n' +
    `${interfaceBlocks.join("\n\n")}\n\n` +
    `export type ${unionName} = ${unionMembers};\n` +
    `export type ${typePrefix}NodeKind = ${unionName}["kind"];\n`
  );
}

export function renderProfileArtifacts(
  options: RenderProfileArtifactsOptions,
): RenderedProfileArtifacts {
  const normalized = normalizeProfileSchemaSource(options.source);

  return {
    metadata: renderMetadataModule(normalized, options.baseName),
    rules: renderRulesModule(normalized.nodes, options.baseName),
    validators: renderValidatorsModule(options.baseName, options.typePrefix),
    schema: renderSchemaModule(normalized, options.baseName),
    types: renderTypesModule(normalized.nodes, options.typePrefix),
  };
}

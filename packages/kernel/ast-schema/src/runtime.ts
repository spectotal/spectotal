import type { AstNode, CanonicalDocumentAst } from "@spectotal/ast";

export type NodeKind = string;
export type ScalarFieldType = "string" | "number" | "boolean";
export type FieldType = ScalarFieldType | "record";
export type ValidationPath = readonly (string | number)[];

export interface ChildSchema {
  readonly accepts: readonly NodeKind[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface ScalarFieldSchema {
  readonly type: ScalarFieldType;
  readonly required?: boolean;
}

export interface RecordFieldSchema {
  readonly type: "record";
  readonly valueTypes: readonly ScalarFieldType[];
  readonly required?: boolean;
}

export type FieldSchema = ScalarFieldSchema | RecordFieldSchema;
export type FieldBuilder = ScalarFieldType | FieldSchema;

export interface GroupSchema {
  readonly accepts?: readonly NodeKind[];
  readonly groups?: readonly string[];
}

export interface AuthoredChildSchema {
  readonly accepts?: readonly NodeKind[];
  readonly groups?: readonly string[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface AuthoredNodeSchema {
  readonly fields?: Readonly<Record<string, FieldSchema>>;
  readonly children?: AuthoredChildSchema;
}

export interface AuthoredProfileSchema {
  readonly profileId: string;
  readonly rootKind: NodeKind;
  readonly groups?: Readonly<Record<string, GroupSchema>>;
  readonly nodes: Readonly<Record<NodeKind, AuthoredNodeSchema>>;
}

export interface NodeSchema {
  readonly kind: NodeKind;
  readonly fields?: Readonly<Record<string, FieldSchema>>;
  readonly children?: ChildSchema;
}

export interface NormalizedProfileSchemaSource {
  readonly profileId: string;
  readonly rootKind: NodeKind;
  readonly nodes: NodeSchemaMap;
}

export type NodeSchemaMap = Readonly<Record<NodeKind, NodeSchema>>;

export interface PatchRule {
  readonly accepts: ReadonlySet<NodeKind>;
  readonly minItems?: number;
  readonly maxItems?: number;
}

export type PatchRuleTable = Readonly<Record<NodeKind, PatchRule | null>>;

export interface SchemaValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path?: ValidationPath;
}

export type SchemaValueValidator = (
  value: unknown,
) => readonly SchemaValidationIssue[];

export interface ProfileSchemaValidators {
  readonly node: SchemaValueValidator;
  readonly root: SchemaValueValidator;
  readonly document: SchemaValueValidator;
}

export interface ProfileSchema {
  readonly profileId: string;
  readonly rootKind: NodeKind;
  readonly nodes: NodeSchemaMap;
  readonly patchRulesByKind: PatchRuleTable;
  readonly validators: ProfileSchemaValidators;
}

interface ProfileSchemaValidatorOptions {
  readonly profileId: string;
  readonly rootKind: NodeKind;
  readonly nodes: NodeSchemaMap;
}

interface CreateProfileSchemaOptions {
  readonly patchRulesByKind?: PatchRuleTable;
  readonly validators?: ProfileSchemaValidators;
}

interface ChildBuilderOptions {
  readonly groups?: readonly string[];
  readonly minItems?: number;
  readonly maxItems?: number;
}

interface GroupBuilderOptions {
  readonly groups?: readonly string[];
}

function appendPath(
  path: ValidationPath,
  segment: string | number,
): ValidationPath {
  return [...path, segment];
}

function createIssue(
  code: string,
  message: string,
  path?: ValidationPath,
): SchemaValidationIssue {
  return path === undefined ? { code, message } : { code, message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueEntries<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function buildFieldSchema(field: FieldBuilder, required: boolean): FieldSchema {
  if (typeof field === "string") {
    return { type: field, required };
  }

  if (field.type === "record") {
    return {
      type: "record",
      valueTypes: uniqueEntries(field.valueTypes),
      required,
    };
  }

  return {
    type: field.type,
    required,
  };
}

function normalizeFields(
  fields?: Readonly<Record<string, FieldSchema>>,
): Readonly<Record<string, FieldSchema>> | undefined {
  if (!fields) return undefined;

  return Object.fromEntries(
    Object.entries(fields).map(([fieldName, fieldSchema]) => {
      if (fieldSchema.type !== "record") {
        return [
          fieldName,
          {
            type: fieldSchema.type,
            ...(fieldSchema.required === true ? { required: true } : {}),
          } satisfies FieldSchema,
        ];
      }

      return [
        fieldName,
        {
          type: "record",
          valueTypes: uniqueEntries(fieldSchema.valueTypes),
          ...(fieldSchema.required === true ? { required: true } : {}),
        } satisfies FieldSchema,
      ];
    }),
  );
}

function resolveGroupKinds(
  source: AuthoredProfileSchema,
  groupName: string,
  stack: readonly string[],
  cache: Map<string, readonly NodeKind[]>,
): readonly NodeKind[] {
  const cached = cache.get(groupName);
  if (cached) return cached;

  if (stack.includes(groupName)) {
    throw new Error(
      `Profile schema group cycle detected: ${[...stack, groupName].join(" -> ")}`,
    );
  }

  const groupSchema = source.groups?.[groupName];
  if (!groupSchema) {
    throw new Error(
      `Unknown profile schema group "${groupName}" in profile "${source.profileId}".`,
    );
  }

  const nextKinds: NodeKind[] = [];
  for (const nestedGroup of groupSchema.groups ?? []) {
    for (const kind of resolveGroupKinds(
      source,
      nestedGroup,
      [...stack, groupName],
      cache,
    )) {
      if (!nextKinds.includes(kind)) nextKinds.push(kind);
    }
  }

  for (const kind of groupSchema.accepts ?? []) {
    if (!nextKinds.includes(kind)) nextKinds.push(kind);
  }

  cache.set(groupName, nextKinds);
  return nextKinds;
}

function expandChildSchema(
  source: AuthoredProfileSchema,
  childSchema: AuthoredChildSchema,
  groupCache: Map<string, readonly NodeKind[]>,
): ChildSchema {
  const accepts: NodeKind[] = [];

  for (const groupName of childSchema.groups ?? []) {
    for (const kind of resolveGroupKinds(source, groupName, [], groupCache)) {
      if (!accepts.includes(kind)) accepts.push(kind);
    }
  }

  for (const kind of childSchema.accepts ?? []) {
    if (!accepts.includes(kind)) accepts.push(kind);
  }

  return {
    accepts,
    ...(childSchema.minItems === undefined
      ? {}
      : { minItems: childSchema.minItems }),
    ...(childSchema.maxItems === undefined
      ? {}
      : { maxItems: childSchema.maxItems }),
  };
}

function createNodeSchemaMap(source: AuthoredProfileSchema): NodeSchemaMap {
  const groupCache = new Map<string, readonly NodeKind[]>();

  return Object.fromEntries(
    Object.entries(source.nodes).map(([kind, schema]) => {
      const fields = normalizeFields(schema.fields);
      const children = schema.children
        ? expandChildSchema(source, schema.children, groupCache)
        : undefined;
      const normalizedSchema: NodeSchema = {
        kind,
        ...(fields ? { fields } : {}),
        ...(children ? { children } : {}),
      };

      return [kind, normalizedSchema];
    }),
  );
}

function createPatchRule(nodeSchema: NodeSchema): PatchRule | null {
  if (!nodeSchema.children) return null;

  return {
    accepts: new Set(nodeSchema.children.accepts),
    ...(nodeSchema.children.minItems === undefined
      ? {}
      : { minItems: nodeSchema.children.minItems }),
    ...(nodeSchema.children.maxItems === undefined
      ? {}
      : { maxItems: nodeSchema.children.maxItems }),
  };
}

function formatAllowedTypes(types: readonly ScalarFieldType[]): string {
  return types.length === 1 ? types[0]! : types.join(" | ");
}

function validateScalarValue(
  fieldType: ScalarFieldType,
  value: unknown,
): boolean {
  return (
    (fieldType === "string" && typeof value === "string") ||
    (fieldType === "number" &&
      typeof value === "number" &&
      Number.isFinite(value)) ||
    (fieldType === "boolean" && typeof value === "boolean")
  );
}

function validateField(
  fieldName: string,
  fieldSchema: FieldSchema,
  value: unknown,
  path: ValidationPath,
): readonly SchemaValidationIssue[] {
  if (value === undefined) {
    return fieldSchema.required
      ? [
          createIssue(
            "missing_field",
            `Field "${fieldName}" is required.`,
            path,
          ),
        ]
      : [];
  }

  if (fieldSchema.type !== "record") {
    return validateScalarValue(fieldSchema.type, value)
      ? []
      : [
          createIssue(
            "invalid_field_type",
            `Field "${fieldName}" must be a ${fieldSchema.type}.`,
            path,
          ),
        ];
  }

  if (!isRecord(value)) {
    return [
      createIssue(
        "invalid_field_type",
        `Field "${fieldName}" must be an object.`,
        path,
      ),
    ];
  }

  const allowedTypes = fieldSchema.valueTypes;
  const issues: SchemaValidationIssue[] = [];

  Object.entries(value).forEach(([entryName, entryValue]) => {
    const valid = allowedTypes.some((entryType) =>
      validateScalarValue(entryType, entryValue),
    );
    if (valid) return;

    issues.push(
      createIssue(
        "invalid_field_type",
        `Field "${fieldName}" values must be ${formatAllowedTypes(allowedTypes)}.`,
        appendPath(path, entryName),
      ),
    );
  });

  return issues;
}

function validateNodeWithSchema(
  nodes: NodeSchemaMap,
  expectedKind: NodeKind,
  value: unknown,
  path: ValidationPath,
): readonly SchemaValidationIssue[] {
  const schema = nodes[expectedKind];
  if (!schema) {
    return [
      createIssue(
        "unknown_schema_kind",
        `No schema is registered for kind "${expectedKind}".`,
        path,
      ),
    ];
  }

  if (!isRecord(value)) {
    return [
      createIssue(
        "invalid_node_type",
        `Node "${expectedKind}" must be an object.`,
        path,
      ),
    ];
  }

  const issues: SchemaValidationIssue[] = [];
  const allowedKeys = new Set<string>(["kind", "id", "children", "provenance"]);

  if (value.kind !== expectedKind) {
    issues.push(
      createIssue(
        "invalid_kind",
        `Expected node kind "${expectedKind}" but received "${String(value.kind)}".`,
        appendPath(path, "kind"),
      ),
    );
  }

  if (value.id !== undefined && typeof value.id !== "string") {
    issues.push(
      createIssue(
        "invalid_id",
        'Field "id" must be a string.',
        appendPath(path, "id"),
      ),
    );
  }

  Object.entries(schema.fields ?? {}).forEach(([fieldName, fieldSchema]) => {
    allowedKeys.add(fieldName);
    issues.push(
      ...validateField(
        fieldName,
        fieldSchema,
        value[fieldName],
        appendPath(path, fieldName),
      ),
    );
  });

  Object.keys(value).forEach((key) => {
    if (!allowedKeys.has(key)) {
      issues.push(
        createIssue(
          "unexpected_field",
          `Field "${key}" is not allowed on node kind "${expectedKind}".`,
          appendPath(path, key),
        ),
      );
    }
  });

  const childrenValue = value.children;

  if (!schema.children) {
    if (childrenValue !== undefined) {
      if (!Array.isArray(childrenValue)) {
        issues.push(
          createIssue(
            "invalid_children_type",
            'Field "children" must be an array.',
            appendPath(path, "children"),
          ),
        );
      } else if (childrenValue.length > 0) {
        issues.push(
          createIssue(
            "unexpected_children",
            `Node kind "${expectedKind}" does not accept children.`,
            appendPath(path, "children"),
          ),
        );
      }
    }

    return issues;
  }

  const childPath = appendPath(path, "children");

  if (childrenValue !== undefined && !Array.isArray(childrenValue)) {
    issues.push(
      createIssue(
        "invalid_children_type",
        'Field "children" must be an array.',
        childPath,
      ),
    );
    return issues;
  }

  const children = Array.isArray(childrenValue) ? childrenValue : [];

  if (
    schema.children.minItems !== undefined &&
    children.length < schema.children.minItems
  ) {
    issues.push(
      createIssue(
        "min_children",
        `Node kind "${expectedKind}" requires at least ${String(schema.children.minItems)} children.`,
        childPath,
      ),
    );
  }

  if (
    schema.children.maxItems !== undefined &&
    children.length > schema.children.maxItems
  ) {
    issues.push(
      createIssue(
        "max_children",
        `Node kind "${expectedKind}" allows at most ${String(schema.children.maxItems)} children.`,
        childPath,
      ),
    );
  }

  children.forEach((child, index) => {
    const nextPath = appendPath(childPath, index);

    if (!isRecord(child)) {
      issues.push(
        createIssue(
          "invalid_child_type",
          "Child nodes must be objects.",
          nextPath,
        ),
      );
      return;
    }

    if (typeof child.kind !== "string") {
      issues.push(
        createIssue(
          "missing_kind",
          'Child nodes must define a string "kind".',
          appendPath(nextPath, "kind"),
        ),
      );
      return;
    }

    if (!schema.children?.accepts.includes(child.kind)) {
      issues.push(
        createIssue(
          "invalid_child_kind",
          `Node kind "${expectedKind}" does not accept child kind "${child.kind}".`,
          appendPath(nextPath, "kind"),
        ),
      );
      return;
    }

    issues.push(...validateNodeWithSchema(nodes, child.kind, child, nextPath));
  });

  return issues;
}

export function recordOf(
  valueTypes: readonly ScalarFieldType[],
): RecordFieldSchema {
  return {
    type: "record",
    valueTypes: uniqueEntries(valueTypes),
  };
}

export function required(field: FieldBuilder): FieldSchema {
  return buildFieldSchema(field, true);
}

export function optional(field: FieldBuilder): FieldSchema {
  return buildFieldSchema(field, false);
}

export function group(
  accepts: readonly NodeKind[],
  options: GroupBuilderOptions = {},
): GroupSchema {
  return {
    ...(accepts.length > 0 ? { accepts } : {}),
    ...(options.groups && options.groups.length > 0
      ? { groups: options.groups }
      : {}),
  };
}

export function children(
  acceptsOrGroup?: readonly NodeKind[] | string,
  options: ChildBuilderOptions = {},
): AuthoredChildSchema {
  const groups = [
    ...(typeof acceptsOrGroup === "string" ? [acceptsOrGroup] : []),
    ...(options.groups ?? []),
  ];

  return {
    ...(Array.isArray(acceptsOrGroup) && acceptsOrGroup.length > 0
      ? { accepts: acceptsOrGroup }
      : {}),
    ...(groups.length > 0 ? { groups } : {}),
    ...(options.minItems === undefined ? {} : { minItems: options.minItems }),
    ...(options.maxItems === undefined ? {} : { maxItems: options.maxItems }),
  };
}

export function node(schema: AuthoredNodeSchema): AuthoredNodeSchema {
  return schema;
}

export function defineProfileSchemaSource<
  const T extends AuthoredProfileSchema,
>(source: T): T {
  return source;
}

export function normalizeProfileSchemaSource(
  source: AuthoredProfileSchema,
): NormalizedProfileSchemaSource {
  return {
    profileId: source.profileId,
    rootKind: source.rootKind,
    nodes: createNodeSchemaMap(source),
  };
}

export function getNodeSchema(
  profile: Pick<ProfileSchema, "nodes">,
  kind: NodeKind,
): NodeSchema | undefined {
  return profile.nodes[kind];
}

export function acceptsChild(
  schema: NodeSchema,
  child: Pick<AstNode, "kind">,
): boolean {
  return schema.children?.accepts.includes(child.kind) === true;
}

export function createPatchRuleTable(nodes: NodeSchemaMap): PatchRuleTable {
  return Object.fromEntries(
    Object.entries(nodes).map(([kind, nodeSchema]) => [
      kind,
      createPatchRule(nodeSchema),
    ]),
  );
}

export function createProfileSchemaValidators(
  options: ProfileSchemaValidatorOptions,
): ProfileSchemaValidators {
  return {
    node(value: unknown): readonly SchemaValidationIssue[] {
      if (!isRecord(value)) {
        return [
          createIssue("invalid_node_type", "Node values must be objects."),
        ];
      }

      if (typeof value.kind !== "string") {
        return [
          createIssue(
            "missing_kind",
            'Node values must define a string "kind".',
            ["kind"],
          ),
        ];
      }

      if (!options.nodes[value.kind]) {
        return [
          createIssue("unknown_kind", `Unknown node kind "${value.kind}".`, [
            "kind",
          ]),
        ];
      }

      return validateNodeWithSchema(options.nodes, value.kind, value, []);
    },

    root(value: unknown): readonly SchemaValidationIssue[] {
      return validateNodeWithSchema(options.nodes, options.rootKind, value, []);
    },

    document(value: unknown): readonly SchemaValidationIssue[] {
      if (!isRecord(value)) {
        return [
          createIssue(
            "invalid_document_type",
            "Canonical AST values must be objects.",
          ),
        ];
      }

      const issues: SchemaValidationIssue[] = [];
      const allowedKeys = new Set(["profileId", "version", "root"]);

      if (value.profileId !== options.profileId) {
        issues.push(
          createIssue(
            "invalid_profile_id",
            `Canonical AST profileId must be "${options.profileId}".`,
            ["profileId"],
          ),
        );
      }

      if (typeof value.version !== "string") {
        issues.push(
          createIssue(
            "invalid_version",
            'Canonical AST field "version" must be a string.',
            ["version"],
          ),
        );
      }

      Object.keys(value).forEach((key) => {
        if (!allowedKeys.has(key)) {
          issues.push(
            createIssue(
              "unexpected_document_field",
              `Field "${key}" is not allowed on CanonicalDocumentAst.`,
              [key],
            ),
          );
        }
      });

      if (!("root" in value)) {
        issues.push(
          createIssue(
            "missing_root",
            'Canonical AST field "root" is required.',
            ["root"],
          ),
        );
        return issues;
      }

      issues.push(
        ...validateNodeWithSchema(options.nodes, options.rootKind, value.root, [
          "root",
        ]),
      );
      return issues;
    },
  };
}

export function createProfileSchema(
  source: AuthoredProfileSchema,
  options: CreateProfileSchemaOptions = {},
): ProfileSchema {
  const normalized = normalizeProfileSchemaSource(source);
  const patchRulesByKind =
    options.patchRulesByKind ?? createPatchRuleTable(normalized.nodes);
  const validators =
    options.validators ??
    createProfileSchemaValidators({
      profileId: normalized.profileId,
      rootKind: normalized.rootKind,
      nodes: normalized.nodes,
    });

  return {
    profileId: normalized.profileId,
    rootKind: normalized.rootKind,
    nodes: normalized.nodes,
    patchRulesByKind,
    validators,
  };
}

export function validateCanonicalDocumentWithSchema(
  document: CanonicalDocumentAst,
  schema: Pick<ProfileSchema, "validators">,
): readonly SchemaValidationIssue[] {
  return schema.validators.document(document);
}

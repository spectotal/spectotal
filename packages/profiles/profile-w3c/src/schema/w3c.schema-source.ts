import {
  children,
  defineProfileSchemaSource,
  group,
  node,
  optional,
  recordOf,
  required,
} from "@spectotal/ast-schema";

const genericFlowElements = ["flowElement", "voidElement"] as const;
const rootLevelBlocks = [
  "heading",
  "section",
  "paragraph",
  "note",
  "example",
  "issue",
] as const;
const elementFields = {
  tagName: required("string"),
  attributes: optional(recordOf(["string", "boolean"])),
} as const;

export const w3cSchemaSource = defineProfileSchemaSource({
  profileId: "w3c",
  rootKind: "document",
  groups: {
    phrasingContent: group(["text", "phrasingElement"]),
    flowContent: group([
      ...rootLevelBlocks,
      "requirement",
      ...genericFlowElements,
    ]),
    documentContent: group([...rootLevelBlocks, ...genericFlowElements]),
    sectionContent: group([
      ...rootLevelBlocks,
      "requirement",
      ...genericFlowElements,
    ]),
    requirementContent: group([
      "paragraph",
      "note",
      "example",
      ...genericFlowElements,
    ]),
    noteContent: group(["paragraph", ...genericFlowElements]),
    exampleContent: group(["heading", "paragraph", ...genericFlowElements]),
  },
  nodes: {
    document: node({
      children: children("documentContent"),
    }),
    section: node({
      children: children("sectionContent"),
    }),
    heading: node({
      fields: {
        level: required("number"),
      },
      children: children("phrasingContent", { minItems: 1 }),
    }),
    paragraph: node({
      children: children("phrasingContent", { minItems: 1 }),
    }),
    text: node({
      fields: {
        value: required("string"),
      },
    }),
    requirement: node({
      fields: {
        requirementId: required("string"),
      },
      children: children("requirementContent"),
    }),
    note: node({
      fields: {
        tone: optional("string"),
      },
      children: children("noteContent"),
    }),
    example: node({
      children: children("exampleContent"),
    }),
    issue: node({
      fields: {
        issueId: required("string"),
      },
      children: children("exampleContent"),
    }),
    flowElement: node({
      fields: elementFields,
      children: children("flowContent"),
    }),
    phrasingElement: node({
      fields: elementFields,
      children: children("phrasingContent"),
    }),
    voidElement: node({
      fields: elementFields,
    }),
  },
});

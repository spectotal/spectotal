import { composeSingleMarkdownSource } from "@spectotal/source-compose";
import { parseW3cMarkdownDocument } from "@spectotal/profile-w3c";

export default async function run(): Promise<unknown> {
  const composition = composeSingleMarkdownSource(
    "fixtures/w3c/single/basic.md",
    "# Title\n\n## Conformance\nKeywords MUST, SHOULD, and MAY are normative.\n",
  );

  if (!composition.source) throw new Error("No composed source");

  return parseW3cMarkdownDocument({
    plan: { profileId: "w3c", inputs: [composition.source.entryUri] },
    source: composition.source,
  });
}

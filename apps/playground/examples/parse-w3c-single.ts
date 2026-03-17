// Verified through apps/playground/tsconfig.verify.json against built package exports.
import { composeSingleMarkdownSource } from "@spectotal/source-compose";
import { parseW3cMarkdownDocument } from "@spectotal/profile-w3c";

async function main(): Promise<void> {
  const composition = composeSingleMarkdownSource(
    "fixtures/w3c/single/basic.md",
    "# Title\n\n## Conformance\nKeywords MUST, SHOULD, and MAY are normative.\n",
  );

  if (!composition.source) throw new Error("No composed source");

  const result = await parseW3cMarkdownDocument({
    plan: { profileId: "w3c", inputs: [composition.source.entryUri] },
    source: composition.source,
  });

  console.log(JSON.stringify(result, null, 2));
}

void main();

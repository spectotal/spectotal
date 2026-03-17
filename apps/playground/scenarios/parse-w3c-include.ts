import { composeSingleMarkdownSource } from "@spectotal/source-compose";
import { parseW3cMarkdownDocument } from "@spectotal/profile-w3c";

export async function run(): Promise<unknown> {
  const composition = composeSingleMarkdownSource(
    "fixtures/w3c/includes/index.md",
    "## Headline section\ntext\n### Details\ntext\n::: include conformance.md :::\n",
  );

  if (!composition.source) throw new Error("No composed source");

  return {
    expectation: "included h2 should become sibling-level after normalization",
    result: await parseW3cMarkdownDocument({
      plan: { profileId: "w3c", inputs: [composition.source.entryUri] },
      source: composition.source,
    }),
  };
}

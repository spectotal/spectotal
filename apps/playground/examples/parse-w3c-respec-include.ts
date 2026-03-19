// Verified through apps/playground/tsconfig.verify.json against built package exports.
import { inspectW3cFixture } from "./_w3c-compose.js";

async function main(): Promise<void> {
  console.log("Expected manual check:");
  console.log(
    '- ReSpec-like HTML include markers should compose markdown when they opt into data-include-format="markdown"',
  );
  console.log(
    JSON.stringify(
      await inspectW3cFixture("w3c/includes/respec-index.md"),
      null,
      2,
    ),
  );
}

void main();

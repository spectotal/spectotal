// Verified through apps/playground/tsconfig.verify.json against built package exports.
import { inspectW3cFixture } from "./_w3c-compose.js";

async function main(): Promise<void> {
  console.log(
    JSON.stringify(await inspectW3cFixture("w3c/single/basic.md"), null, 2),
  );
}

void main();

import { inspectW3cFixture } from "../examples/_w3c-compose.js";

export async function run(): Promise<unknown> {
  return {
    expectation: "included h2 should become sibling-level after normalization",
    result: await inspectW3cFixture("w3c/includes/index.md"),
  };
}

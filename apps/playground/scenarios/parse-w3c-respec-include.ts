import { inspectW3cFixture } from "../examples/_w3c-compose.js";

export async function run(): Promise<unknown> {
  return {
    expectation:
      'ReSpec-like HTML include markers should compose markdown when they opt into data-include-format="markdown"',
    result: await inspectW3cFixture("w3c/includes/respec-index.md"),
  };
}

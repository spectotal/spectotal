import { inspectW3cFixture } from "../examples/_w3c-compose.js";

export async function run(): Promise<unknown> {
  return {
    expectation:
      "block html should become generic flow elements and inline html containers should preserve markdown children when mdast exposes them",
    result: await inspectW3cFixture("w3c/html/generic-elements.md"),
  };
}

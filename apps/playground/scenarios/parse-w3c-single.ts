import { inspectW3cFixture } from "../examples/_w3c-compose.js";

export default async function run(): Promise<unknown> {
  return inspectW3cFixture("w3c/single/basic.md");
}

import { readFile } from "node:fs/promises";

import {
  composeMarkdownSourceFromUrl,
  type CompositionHost,
} from "@spectotal/source-compose";
import {
  normalizeW3cDocument,
  parseW3cMarkdownDocument,
} from "@spectotal/profile-w3c";

const fileHost: CompositionHost = {
  async resolve(target, from) {
    return new URL(target, from);
  },
  async load(url) {
    return {
      url,
      content: await readFile(url, "utf8"),
    };
  },
};

export function fixtureUrl(pathname: string): URL {
  return new URL(`../fixtures/${pathname}`, import.meta.url);
}

export async function inspectW3cFixture(pathname: string): Promise<unknown> {
  const entryUrl = fixtureUrl(pathname);
  const composition = await composeMarkdownSourceFromUrl(entryUrl, fileHost);

  if (!composition.source) {
    return { composition, parsed: null, canonical: null };
  }

  const plan = {
    profileId: "w3c" as const,
    inputs: [composition.source.entryUri],
  };
  const parsed = await parseW3cMarkdownDocument({
    plan,
    source: composition.source,
  });
  const canonical = await normalizeW3cDocument(parsed.draft, { plan });

  return {
    composition,
    parsed,
    canonical,
  };
}

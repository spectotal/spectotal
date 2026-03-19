import { readFile } from "node:fs/promises";

import {
  composeW3cSourceFromUrl,
  normalizeW3cDocument,
  parseW3cMarkdownDocument,
} from "@spectotal/profile-w3c";
import type { CompositionHost } from "@spectotal/source-compose";

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

const fixtureBase = import.meta.url.includes("/dist-scenarios/")
  ? new URL("../../fixtures/", import.meta.url)
  : new URL("../fixtures/", import.meta.url);

export function fixtureUrl(pathname: string): URL {
  return new URL(pathname, fixtureBase);
}

export async function inspectW3cFixture(pathname: string): Promise<unknown> {
  const entryUrl = fixtureUrl(pathname);
  const composition = await composeW3cSourceFromUrl(entryUrl, fileHost);

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

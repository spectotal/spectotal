import {
  coreHtmlParsers,
  coreMarkdownParsers,
  corePlugins,
  type SpectotalProfile,
} from '@spectotal/core';

export const w3cProfile: SpectotalProfile = {
  id: 'w3c',
  registerParsers(registry) {
    for (const parser of coreHtmlParsers) {
      registry.registerHtmlParser(parser);
    }
    for (const parser of coreMarkdownParsers) {
      registry.registerMarkdownParser(parser);
    }
  },
  postprocessPlugins: corePlugins,
};

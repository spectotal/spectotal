import type { ProfileParserRegistry as IProfileParserRegistry } from './types.js';

export class ProfileParserRegistry implements IProfileParserRegistry {
  private readonly htmlParsersList: unknown[] = [];
  private readonly markdownParsersList: unknown[] = [];

  registerHtmlParser(parser: unknown): void {
    this.htmlParsersList.push(parser);
  }

  registerMarkdownParser(parser: unknown): void {
    this.markdownParsersList.push(parser);
  }

  get htmlParsers(): readonly unknown[] {
    return this.htmlParsersList;
  }

  get markdownParsers(): readonly unknown[] {
    return this.markdownParsersList;
  }
}

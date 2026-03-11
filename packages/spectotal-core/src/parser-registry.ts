import type {
  Document,
  ProfileParser,
  ProfileParserRegistry as IProfileParserRegistry,
  SpecConfig,
} from './types.js';

export class ProfileParserRegistry<
  TDocument extends Document = Document,
  TConfig extends SpecConfig = SpecConfig,
> implements IProfileParserRegistry<TDocument, TConfig> {
  private readonly parsersList: Array<ProfileParser<TDocument, TConfig>> = [];

  registerParser(parser: ProfileParser<TDocument, TConfig>): void {
    this.parsersList.push(parser);
  }

  get parsers(): readonly ProfileParser<TDocument, TConfig>[] {
    return this.parsersList;
  }
}

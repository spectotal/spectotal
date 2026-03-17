export interface CliCommand {
  readonly name: string;
  run(args: readonly string[]): Promise<number>;
}

export const SPECTOTAL_CLI_VERSION = "0.1.0";

import type { AstPatch } from "@spectotal/ast-patch";

export interface FixtureCase {
  readonly name: string;
  readonly source: string;
  readonly expectedProfileId: string;
}

export interface PatchExpectation {
  readonly description: string;
  readonly patches: readonly AstPatch[];
}

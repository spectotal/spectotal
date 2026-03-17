import type { CanonicalDocumentAst } from "@spectotal/ast";
import type { DerivationBundle } from "@spectotal/derivations";

export interface LintFactSource {
  readonly ast: CanonicalDocumentAst;
  readonly derivations: DerivationBundle;
}

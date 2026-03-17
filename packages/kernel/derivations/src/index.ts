export interface DerivationBundle {
  readonly artifacts: Readonly<Record<string, unknown>>;
}

export function emptyDerivationBundle(): DerivationBundle {
  return { artifacts: {} };
}

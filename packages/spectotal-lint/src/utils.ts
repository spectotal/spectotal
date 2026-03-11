/**
 * Utility helpers for the Spectotal lint engine.
 */

/**
 * Normalize a term for consistent lookup
 * Mirrors term normalization used by parsing/postprocess stages.
 */
export function normalizeTerm(term: string): string {
    return term
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFKC');
}

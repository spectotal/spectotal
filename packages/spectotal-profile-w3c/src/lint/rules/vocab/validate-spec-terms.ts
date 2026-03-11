import type { LintContext, LintRule } from '@spectotal/lint';

const SPEC_TERMS_VOCAB_URL = 'https://www.w3.org/ns/spec';

const FALLBACK_SPEC_TERMS = new Set([
  'MUST', 'MUSTNOT', 'REQUIRED', 'SHALL', 'SHALLNOT',
  'SHOULD', 'SHOULDNOT', 'RECOMMENDED', 'NOTRECOMMENDED',
  'MAY', 'OPTIONAL',
  'Content', 'ProducerOfContent', 'Player', 'Consumer',
  'RespondingAgent', 'Processor', 'Module', 'ProducerOfInstructions',
  'Profile', 'SpecificationGuidelines', 'Server', 'Client',
  'Specification', 'Requirement', 'Advisement', 'Statement',
  'Prohibition', 'Recommendation', 'Permission',
  'requirement', 'requirementLevel', 'requirementSubject',
  'requirementReference', 'advisement', 'advisementLevel',
  'statement', 'classesOfProducts', 'testScript', 'testSuite',
  'testCase', 'implementationReport', 'violatesAdvice',
  'basedOnConsensus', 'reviewProcess', 'publicationRules',
  'operativeProcess', 'scope', 'intellectualPropertyRights',
  'acknowledgements',
  'RequirementLevel', 'ClassesOfProducts', 'AdvisementLevel',
]);

let cachedTerms: Set<string> | null = null;
let fetchAttempted = false;

async function fetchSpecTermsVocab(): Promise<Set<string>> {
  if (cachedTerms) return cachedTerms;
  if (fetchAttempted) return FALLBACK_SPEC_TERMS;
  fetchAttempted = true;

  try {
    const response = await fetch(SPEC_TERMS_VOCAB_URL, {
      headers: { Accept: 'text/turtle, application/n-triples, text/plain' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return FALLBACK_SPEC_TERMS;
    }

    const text = await response.text();
    const terms = new Set<string>();
    const termPattern = /spec:(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = termPattern.exec(text)) !== null) {
      terms.add(match[1]);
    }

    if (terms.size > 0) {
      cachedTerms = terms;
      return terms;
    }

    return FALLBACK_SPEC_TERMS;
  } catch {
    return FALLBACK_SPEC_TERMS;
  }
}

function extractSpecTerm(iri: string): string | null {
  const match = iri.match(/^spec:(\w+)$/);
  return match ? match[1] : null;
}

export const validateSpecTermsRule: LintRule = {
  meta: {
    name: 'vocab/validate-spec-terms',
    code: 'validate-spec-terms',
    severity: 'warning',
    description: 'Validates spec:* IRIs against W3C Spec Terms vocabulary',
    category: 'reference',
  },

  create(context: LintContext) {
    return {
      async onDocument(document) {
        const statements = document.indexes?.statements ?? [];
        if (statements.length === 0) return;

        const validTerms = await fetchSpecTermsVocab();
        for (const statement of statements) {
          if (!statement.subject) continue;

          const term = extractSpecTerm(statement.subject);
          if (!term || validTerms.has(term)) continue;

          context.report({
            message: `Unknown Spec Terms concept "spec:${term}". Valid terms are defined at ${SPEC_TERMS_VOCAB_URL}`,
            file: statement.sourcePos?.file ?? document.sourcePos?.file ?? '<unknown>',
            sourcePos: statement.sourcePos,
          });
        }
      },
    };
  },
};

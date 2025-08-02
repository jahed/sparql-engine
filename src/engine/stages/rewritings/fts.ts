import type { VariableTerm } from "sparqljs";
import type { EngineTriple } from "../../../types.ts";
import { isIRI, isVariable } from "../../../utils/rdf.ts";

const SES_PREFIX = "https://callidon.github.io/sparql-engine/search#";
function SES(suffix: string): string {
  return `${SES_PREFIX}${suffix}`;
}

export const SES_search = SES("search");
export const SES_matchAllTerms = SES("matchAllTerms");
export const SES_minRelevance = SES("minRelevance");
export const SES_maxRelevance = SES("maxRelevance");
export const SES_minRank = SES("minRank");
export const SES_maxRank = SES("maxRank");
export const SES_relevance = SES("relevance");
export const SES_rank = SES("rank");

/**
 * A Full Text Search query
 */
export interface FullTextSearchQuery {
  /** The pattern queried by the full text search */
  pattern: EngineTriple;
  /** The SPARQL varibale on which the full text search is performed */
  variable: VariableTerm;
  /** The magic triples sued to configured the full text search query */
  magicTriples: EngineTriple[];
}

/**
 * The results of extracting full text search queries from a BGP
 */
export interface ExtractionResults {
  /** The set of full text search queries extracted from the BGP */
  queries: FullTextSearchQuery[];
  /** Regular triple patterns, i.e., those who should be evaluated as a regular BGP */
  classicPatterns: EngineTriple[];
}

/**
 * Extract all full text search queries from a BGP, using magic triples to identify them.
 * A magic triple is an IRI prefixed by 'https://callidon.github.io/sparql-engine/search#' (ses:search, ses:rank, ses:minRank, etc).
 * @param bgp - BGP to analyze
 * @return The extraction results
 */
export function extractFullTextSearchQueries(
  bgp: EngineTriple[]
): ExtractionResults {
  const queries: FullTextSearchQuery[] = [];
  const classicPatterns: EngineTriple[] = [];
  // find, validate and group all magic triples per query variable
  const patterns: EngineTriple[] = [];
  const magicGroups = new Map<string, EngineTriple[]>();
  bgp.forEach((triple) => {
    // A magic triple is an IRI prefixed by 'https://callidon.github.io/sparql-engine/search#'
    if (
      isIRI(triple.predicate) &&
      triple.predicate.value.startsWith(SES_PREFIX)
    ) {
      // assert that the magic triple's subject is a variable
      if (!isVariable(triple.subject)) {
        throw new SyntaxError(
          `Invalid Full Text Search query: the subject of the magic triple ${triple} must a valid URI/IRI.`
        );
      }
      if (!magicGroups.has(triple.subject.value)) {
        magicGroups.set(triple.subject.value, [triple]);
      } else {
        magicGroups.get(triple.subject.value)!.push(triple);
      }
    } else {
      patterns.push(triple);
    }
  });
  // find all triple pattern whose object is the subject of some magic triples
  patterns.forEach((pattern) => {
    if (magicGroups.has(pattern.subject.value)) {
      queries.push({
        pattern,
        variable: pattern.subject as VariableTerm,
        magicTriples: magicGroups.get(pattern.subject.value)!,
      });
    } else if (magicGroups.has(pattern.object.value)) {
      queries.push({
        pattern,
        variable: pattern.object as VariableTerm,
        magicTriples: magicGroups.get(pattern.object.value)!,
      });
    } else {
      classicPatterns.push(pattern);
    }
  });
  return { queries, classicPatterns };
}

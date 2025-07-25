"use strict";

import type { IStringQuad } from "rdf-string";
import * as rdf from "../../../utils/rdf.ts";

/**
 * A Full Text Search query
 */
export interface FullTextSearchQuery {
  /** The pattern queried by the full text search */
  pattern: IStringQuad;
  /** The SPARQL varibale on which the full text search is performed */
  variable: string;
  /** The magic triples sued to configured the full text search query */
  magicTriples: IStringQuad[];
}

/**
 * The results of extracting full text search queries from a BGP
 */
export interface ExtractionResults {
  /** The set of full text search queries extracted from the BGP */
  queries: FullTextSearchQuery[];
  /** Regular triple patterns, i.e., those who should be evaluated as a regular BGP */
  classicPatterns: IStringQuad[];
}

/**
 * Extract all full text search queries from a BGP, using magic triples to identify them.
 * A magic triple is an IRI prefixed by 'https://callidon.github.io/sparql-engine/search#' (ses:search, ses:rank, ses:minRank, etc).
 * @param bgp - BGP to analyze
 * @return The extraction results
 */
export function extractFullTextSearchQueries(
  bgp: IStringQuad[]
): ExtractionResults {
  const queries: FullTextSearchQuery[] = [];
  const classicPatterns: IStringQuad[] = [];
  // find, validate and group all magic triples per query variable
  const patterns: IStringQuad[] = [];
  const magicGroups = new Map<string, IStringQuad[]>();
  const prefix = rdf.SES("");
  bgp.forEach((triple) => {
    // A magic triple is an IRI prefixed by 'https://callidon.github.io/sparql-engine/search#'
    if (rdf.isIRI(triple.predicate) && triple.predicate.startsWith(prefix)) {
      // assert that the magic triple's subject is a variable
      if (!rdf.isVariable(triple.subject)) {
        throw new SyntaxError(
          `Invalid Full Text Search query: the subject of the magic triple ${triple} must a valid URI/IRI.`
        );
      }
      if (!magicGroups.has(triple.subject)) {
        magicGroups.set(triple.subject, [triple]);
      } else {
        magicGroups.get(triple.subject)!.push(triple);
      }
    } else {
      patterns.push(triple);
    }
  });
  // find all triple pattern whose object is the subject of some magic triples
  patterns.forEach((pattern) => {
    if (magicGroups.has(pattern.subject)) {
      queries.push({
        pattern,
        variable: pattern.subject,
        magicTriples: magicGroups.get(pattern.subject)!,
      });
    } else if (magicGroups.has(pattern.object)) {
      queries.push({
        pattern,
        variable: pattern.object,
        magicTriples: magicGroups.get(pattern.object)!,
      });
    } else {
      classicPatterns.push(pattern);
    }
  });
  return { queries, classicPatterns };
}

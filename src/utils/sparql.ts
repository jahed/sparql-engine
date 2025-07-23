"use strict";

import * as crypto from "crypto";
import { includes, union } from "lodash-es";
import type { Algebra } from "sparqljs";
import * as rdf from "./rdf.ts";

/**
 * Hash Basic Graph pattern to assign them an unique ID
 * @param bgp - Basic Graph Pattern to hash
 * @param md5 - True if the ID should be hashed to md5, False to keep it as a plain text string
 * @return An unique ID to identify the BGP
 */
export function hashBGP(
  bgp: Algebra.TripleObject[],
  md5: boolean = false
): string {
  const hashedBGP = bgp.map(rdf.hashTriple).join(";");
  if (!md5) {
    return hashedBGP;
  }
  const hash = crypto.createHash("md5");
  hash.update(hashedBGP);
  return hash.digest("hex");
}

/**
 * Get the set of SPARQL variables in a triple pattern
 * @param  pattern - Triple Pattern
 * @return The set of SPARQL variables in the triple pattern
 */
export function variablesFromPattern(pattern: Algebra.TripleObject): string[] {
  const res: string[] = [];
  if (rdf.isVariable(pattern.subject)) {
    res.push(pattern.subject);
  }
  if (rdf.isVariable(pattern.predicate)) {
    res.push(pattern.predicate);
  }
  if (rdf.isVariable(pattern.object)) {
    res.push(pattern.object);
  }
  return res;
}

/**
 * Perform a join ordering of a set of triple pattern, i.e., a BGP.
 * Sort pattern such as they creates a valid left linear tree without cartesian products (unless it's required to evaluate the BGP)
 * @param  patterns - Set of triple pattern
 * @return Order set of triple patterns
 */
export function leftLinearJoinOrdering(
  patterns: Algebra.TripleObject[]
): Algebra.TripleObject[] {
  const results: Algebra.TripleObject[] = [];
  const x = new Set();
  if (patterns.length > 0) {
    // sort pattern by join predicate
    let p = patterns.shift()!;
    let variables = variablesFromPattern(p);
    results.push(p);
    while (patterns.length > 0) {
      // find the next pattern with a common join predicate
      let index = patterns.findIndex((pattern) => {
        return (
          includes(variables, pattern.subject) ||
          includes(variables, pattern.predicate) ||
          includes(variables, pattern.object)
        );
      });
      // if not found, trigger a cartesian product with the first pattern of the sorted set
      if (index < 0) {
        index = 0;
      }
      // get the new pattern to join with
      p = patterns.splice(index, 1)[0];
      variables = union(variables, variablesFromPattern(p));
      results.push(p);
    }
  }
  return results;
}

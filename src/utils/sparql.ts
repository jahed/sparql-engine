"use strict";

import { unionBy } from "lodash-es";
import type { EngineTriple, EngineVariable } from "../types.ts";
import { isVariable } from "./rdf.ts";

/**
 * Get the set of SPARQL variables in a triple pattern
 * @param  pattern - Triple Pattern
 * @return The set of SPARQL variables in the triple pattern
 */
export function variablesFromPattern(pattern: EngineTriple): EngineVariable[] {
  const res: EngineVariable[] = [];
  if (isVariable(pattern.subject)) {
    res.push(pattern.subject);
  }
  if (isVariable(pattern.predicate)) {
    res.push(pattern.predicate);
  }
  if (isVariable(pattern.object)) {
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
  patterns: EngineTriple[]
): EngineTriple[] {
  const results: EngineTriple[] = [];
  if (patterns.length > 0) {
    // sort pattern by join predicate
    let p = patterns.shift()!;
    let variables = variablesFromPattern(p);
    results.push(p);
    while (patterns.length > 0) {
      // find the next pattern with a common join predicate
      let index = patterns.findIndex((pattern) => {
        return variables.some(
          (variable) =>
            variable.equals(pattern.subject) ||
            variable.equals(pattern.predicate) ||
            variable.equals(pattern.object)
        );
      });
      // if not found, trigger a cartesian product with the first pattern of the sorted set
      if (index < 0) {
        index = 0;
      }
      // get the new pattern to join with
      p = patterns.splice(index, 1)[0];
      variables = unionBy(variables, variablesFromPattern(p), (v) => v.value);
      results.push(p);
    }
  }
  return results;
}

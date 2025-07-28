// SPDX-License-Identifier: MIT
"use strict";

import type { EngineTriple } from "../../types.ts";
import { isIRI } from "../../utils/rdf.ts";

const HINT_PREFIX = "http://callidon.github.io/sparql-engine/hints#";

/**
 * Build an URI under the <http://www.bigdata.com/queryHints#> namespace
 * @param  suffix - Suffix append to the HINT namespace
 * @return A new URI under the HINT namespace
 */
export function HINT(suffix: string) {
  return HINT_PREFIX + suffix;
}

/**
 * Scopes of a query hint, i.e., Query or Basic Graph pattern
 */
type QueryHintScope = number;
export const QUERY_HINT_SCOPE = {
  QUERY: 0,
  BGP: 1,
};

/**
 * Types of query hints
 */
type QueryHint = number;
export const QUERY_HINT = {
  USE_HASH_JOIN: 0,
  USE_SYMMETRIC_HASH_JOIN: 1,
  SORTED_TRIPLES: 2,
};

export class QueryHints {
  protected _bgpHints: Map<QueryHint, boolean>;

  constructor() {
    this._bgpHints = new Map();
  }

  /**
   * Clone the set of query hints
   * @return The cloned set of query hints
   */
  clone(): QueryHints {
    const res = new QueryHints();
    this._bgpHints.forEach((value, key) => res.add(QUERY_HINT_SCOPE.BGP, key));
    return res;
  }

  /**
   * Merge the current hints with another set of hints
   * @param  other - Query hints to merge with
   * @return The merged set of query hints
   */
  merge(other: QueryHints): QueryHints {
    const res = this.clone();
    other._bgpHints.forEach((value, key) => res.add(QUERY_HINT_SCOPE.BGP, key));
    return res;
  }

  /**
   * Add a query hint to the set
   * @param scope - Scope of the hint (Query, BGP, etc)
   * @param hint - Type of hint
   */
  add(scope: QueryHintScope, hint: QueryHint): void {
    if (scope === QUERY_HINT_SCOPE.BGP) {
      this._bgpHints.set(hint, true);
    }
  }

  /**
   * Test if a hint exists
   * @param scope - Scope of the hint (Query, BGP, etc)
   * @param hint - Type of hint
   * @return True if the hint exists, False otherwise
   */
  has(scope: QueryHintScope, hint: QueryHint): boolean {
    if (scope === QUERY_HINT_SCOPE.BGP) {
      return this._bgpHints.has(hint);
    }
    return false;
  }

  /**
   * Serialize the set of query hints into a string
   * @return A string which represents the set of query hints
   */
  toString(): string {
    let res = "";
    this._bgpHints.forEach((value, key) => {
      switch (key) {
        case QUERY_HINT.USE_SYMMETRIC_HASH_JOIN:
          res += `<${HINT("BGP")}> <${HINT("SymmetricHashJoin")}> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> .\n`;
          break;
        default:
          res += `<${HINT("BGP")}> _:${key} "${value}".\n`;
          break;
      }
    });
    return res;
  }
}

export function parseHints(
  bgp: EngineTriple[],
  previous?: QueryHints
): [EngineTriple[], QueryHints] {
  let res = new QueryHints();
  const regularTriples: EngineTriple[] = [];
  bgp.forEach((triple) => {
    if (
      isIRI(triple.subject) &&
      triple.subject.value.startsWith(HINT_PREFIX) &&
      triple.subject.value === HINT("Group") &&
      isIRI(triple.predicate)
    ) {
      switch (triple.predicate.value) {
        case HINT("HashJoin"):
          res.add(QUERY_HINT_SCOPE.BGP, QUERY_HINT.USE_HASH_JOIN);
          break;
        case HINT("SymmetricHashJoin"):
          res.add(QUERY_HINT_SCOPE.BGP, QUERY_HINT.USE_SYMMETRIC_HASH_JOIN);
          break;
      }
    } else {
      regularTriples.push(triple);
    }
  });
  if (previous !== undefined) {
    res = res.merge(previous);
  }
  return [regularTriples, res];
}

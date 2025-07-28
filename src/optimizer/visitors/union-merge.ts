// SPDX-License-Identifier: MIT
"use strict";

import { cloneDeep, partition } from "lodash-es";

import type { Pattern, UnionPattern } from "sparqljs";
import PlanVisitor from "../plan-visitor.ts";

/**
 * Implements the UNION Merge rule: all SPARQL UNION clauses in the same group pattern
 * should be merged as one single UNION clause.
 */
export default class UnionMerge extends PlanVisitor {
  visitUnion(node: UnionPattern): Pattern {
    const newNode = cloneDeep(node);
    const parts = partition(
      newNode.patterns,
      (group) => group.type === "union"
    );
    const singleUnion = parts[0].reduce<Pattern[]>(
      (acc, c) => acc.concat(c.patterns),
      []
    );
    newNode.patterns = (parts[1] as Pattern[]).concat(singleUnion);
    return newNode;
  }
}

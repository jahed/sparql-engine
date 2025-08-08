// SPDX-License-Identifier: MIT
import type { SparqlQuery } from "sparqljs";
import PlanVisitor from "./plan-visitor.ts";
import UnionMerge from "./visitors/union-merge.ts";

/**
 * An Optimizer applies a set of optimization rules, implemented using subclasses of {@link PlanVisitor}.
 */
export default class Optimizer {
  private _visitors: PlanVisitor[];

  constructor() {
    this._visitors = [];
  }

  /**
   * Get an optimizer configured with the default optimization rules
   * @return A new Optimizer pre-configured with default rules
   */
  static getDefault(): Optimizer {
    const opt = new Optimizer();
    opt.addVisitor(new UnionMerge());
    return opt;
  }

  /**
   * Register a new visitor, which implements an optimization rule.
   * @param visitor - Visitor
   */
  addVisitor(visitor: PlanVisitor): void {
    this._visitors.push(visitor);
  }

  /**
   * Optimize a SPARQL query expression tree, by applying the set of rules.
   * @param  plan - SPARQL query expression tree to iptimize
   * @return Optimized SPARQL query expression tree
   */
  optimize(plan: SparqlQuery): SparqlQuery {
    return this._visitors.reduce((current, v) => v.visit(current), plan);
  }
}

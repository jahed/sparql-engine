// SPDX-License-Identifier: MIT
import type { Ordering, Term } from "sparqljs";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";

import { Bindings } from "../rdf/bindings.ts";
import type { Primitive } from "../types.ts";
import { termToValue, UNBOUND } from "../utils/rdf.ts";

/**
 * Build a comparator function from an ORDER BY clause content
 * @private
 * @param  comparators - ORDER BY comparators
 * @return A comparator function
 */
function _compileComparators(comparators: Ordering[]) {
  const comparatorsFuncs = comparators.map((c: Ordering) => {
    return (left: Bindings, right: Bindings) => {
      const expr = (c.expression as Term).value;
      const a = termToValue<Primitive>(left.get(expr) || UNBOUND);
      const b = termToValue<Primitive>(right.get(expr) || UNBOUND);
      if (a < b) {
        return c.descending ? 1 : -1;
      } else if (a > b) {
        return c.descending ? -1 : 1;
      }
      return 0;
    };
  });
  return (left: Bindings, right: Bindings) => {
    let temp;
    for (let comp of comparatorsFuncs) {
      temp = comp(left, right);
      if (temp !== 0) {
        return temp;
      }
    }
    return 0;
  };
}

/**
 * A OrderByOperator implements a ORDER BY clause, i.e.,
 * it sorts solution mappings produced by another operator
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOrderBy}
 * @param source - Input {@link PipelineStage}
 * @param comparators - Set of ORDER BY comparators
 * @return A {@link PipelineStage} which evaluate the ORDER BY operation
 */
export default function orderby(
  source: PipelineStage<Bindings>,
  comparators: Ordering[]
) {
  const comparator = _compileComparators(comparators);
  const engine = Pipeline.getInstance();
  return engine.mergeMap(engine.collect(source), (values: Bindings[]) => {
    values.sort((a, b) => comparator(a, b));
    return engine.from(values);
  });
}

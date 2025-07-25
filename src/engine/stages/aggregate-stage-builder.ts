/* file : aggregate-stage-builder.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import { isString } from "lodash-es";
import type { Expression, Grouping, Query } from "sparqljs";
import bind from "../../operators/bind.ts";
import type { CustomFunctions } from "../../operators/expressions/sparql-expression.ts";
import filter from "../../operators/sparql-filter.ts";
import groupBy from "../../operators/sparql-groupby.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import { toN3 } from "../../utils/rdf.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import StageBuilder from "./stage-builder.ts";

/**
 * An AggregateStageBuilder handles the evaluation of Aggregations operations,
 * GROUP BY and HAVING clauses in SPARQL queries.
 * @see https://www.w3.org/TR/sparql11-query/#aggregates
 * @author Thomas Minier
 */
export default class AggregateStageBuilder extends StageBuilder {
  /**
   * Build a {@link PipelineStage} for the evaluation of SPARQL aggregations
   * @param source  - Input {@link PipelineStage}
   * @param query   - Parsed SPARQL query (logical execution plan)
   * @param options - Execution options
   * @return A {@link PipelineStage} which evaluate SPARQL aggregations
   */
  execute(
    source: PipelineStage<Bindings>,
    query: Query,
    context: ExecutionContext,
    customFunctions?: CustomFunctions
  ): PipelineStage<Bindings> {
    let iterator = source;
    // group bindings using the GROUP BY clause
    // WARNING: an empty GROUP BY clause will create a single group with all bindings
    iterator = this._executeGroupBy(
      source,
      ("group" in query && query.group) || [],
      context,
      customFunctions
    );
    // next, apply the optional HAVING clause to filter groups
    if ("having" in query) {
      iterator = this._executeHaving(
        iterator,
        query.having || [],
        context,
        customFunctions
      );
    }
    return iterator;
  }

  /**
   * Build a {@link PipelineStage} for the evaluation of a GROUP BY clause
   * @param source  - Input {@link PipelineStage}
   * @param  groupby - GROUP BY clause
   * @param  options - Execution options
   * @return A {@link PipelineStage} which evaluate a GROUP BY clause
   */
  _executeGroupBy(
    source: PipelineStage<Bindings>,
    groupby: Grouping[],
    context: ExecutionContext,
    customFunctions?: CustomFunctions
  ): PipelineStage<Bindings> {
    let iterator = source;
    // extract GROUP By variables & rewrite SPARQL expressions into BIND clauses
    const groupingVars: string[] = [];
    groupby.forEach((g) => {
      if (isString(g.expression)) {
        groupingVars.push(g.expression);
      } else if (g.variable) {
        const variableString = toN3(g.variable);
        groupingVars.push(variableString);
        iterator = bind(
          iterator,
          variableString,
          g.expression,
          customFunctions
        );
      }
    });
    return groupBy(iterator, groupingVars);
  }

  /**
   * Build a {@link PipelineStage} for the evaluation of a HAVING clause
   * @param  source  - Input {@link PipelineStage}
   * @param  having  - HAVING clause
   * @param  options - Execution options
   * @return A {@link PipelineStage} which evaluate a HAVING clause
   */
  _executeHaving(
    source: PipelineStage<Bindings>,
    having: Expression[],
    context: ExecutionContext,
    customFunctions?: CustomFunctions
  ): PipelineStage<Bindings> {
    // thanks to the flexibility of SPARQL expressions,
    // we can rewrite a HAVING clause in a set of FILTER clauses!
    return having.reduce((iter, expression) => {
      return filter(iter, expression, customFunctions);
    }, source);
  }
}

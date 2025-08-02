// SPDX-License-Identifier: MIT
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";

import type { Pattern } from "sparqljs";
import ExecutionContext from "../engine/context/execution-context.ts";
import { PlanBuilder } from "../engine/plan-builder.ts";
import { Bindings } from "../rdf/bindings.ts";

/**
 * Handles an SPARQL OPTIONAL clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#optionals}
 * @param source - Input {@link PipelineStage}
 * @param patterns - OPTIONAL clause, i.e., a SPARQL group pattern
 * @param builder - Instance of the current {@link PlanBuilder}
 * @param context - Execution context
 * @return A {@link PipelineStage} which evaluate the OPTIONAL operation
 */
export default async function optional(
  source: PipelineStage<Bindings>,
  patterns: Pattern[],
  builder: PlanBuilder,
  context: ExecutionContext
): Promise<PipelineStage<Bindings>> {
  const seenBefore: Bindings[] = [];
  const engine = Pipeline.getInstance();
  const start = engine.tap(source, (bindings: Bindings) => {
    seenBefore.push(bindings);
  });
  let leftOp = await builder._buildWhere(start, patterns, context);
  leftOp = engine.tap(leftOp, (bindings: Bindings) => {
    // remove values that matches a results from seenBefore
    const index = seenBefore.findIndex((b: Bindings) => {
      return b.isSubset(bindings);
    });
    if (index >= 0) {
      seenBefore.splice(index, 1);
    }
  });
  return engine.merge(leftOp, engine.from(seenBefore));
}

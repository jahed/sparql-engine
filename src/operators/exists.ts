// SPDX-License-Identifier: MIT
import ExecutionContext from "../engine/context/execution-context.ts";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import { PlanBuilder } from "../engine/plan-builder.ts";
import { BindingBase, Bindings } from "../rdf/bindings.ts";

interface ConditionalBindings {
  bindings: Bindings;
  output: boolean;
}

/**
 * Evaluates a SPARQL FILTER (NOT) EXISTS clause
 * TODO this function could be simplified using a filterMap like operator, we should check if Rxjs offers that filterMap
 * @param source    - Source {@link PipelineStage}
 * @param groups    - Content of the FILTER clause
 * @param builder   - Plan builder used to evaluate subqueries
 * @param notexists - True if the filter is NOT EXISTS, False otherwise
 * @param context   - Execution context
 * @return A {@link PipelineStage} which evaluate the FILTER (NOT) EXISTS operation
 */
export default function exists(
  source: PipelineStage<Bindings>,
  groups: any[],
  builder: PlanBuilder,
  notexists: boolean,
  context: ExecutionContext
) {
  const defaultValue: Bindings = new BindingBase();
  defaultValue.setProperty("exists", false);
  const engine = Pipeline.getInstance();
  let evaluator = engine.mergeMapAsync(source, async (bindings: Bindings) => {
    let op = await builder._buildWhere(engine.of(bindings), groups, context);
    op = engine.defaultValues(op, defaultValue);
    op = engine.first(op);
    return engine.map(op, (b: Bindings) => {
      const exists: boolean =
        !b.hasProperty("exists") || b.getProperty("exists");
      return {
        bindings,
        output: (exists && !notexists) || (!exists && notexists),
      };
    });
  });
  evaluator = engine.filter(evaluator, (b: ConditionalBindings) => {
    return b.output;
  });
  return engine.map(evaluator, (b: ConditionalBindings) => b.bindings);
}

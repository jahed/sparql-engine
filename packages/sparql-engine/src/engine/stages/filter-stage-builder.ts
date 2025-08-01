// SPDX-License-Identifier: MIT
import exists from "../../operators/exists.ts";
import sparqlFilter from "../../operators/sparql-filter.ts";
import StageBuilder from "./stage-builder.ts";

import type { FilterPattern, OperationExpression } from "sparqljs";
import type { CustomFunctions } from "../../operators/expressions/sparql-expression.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

/**
 * A FilterStageBuilder evaluates FILTER clauses
 */
export default class FilterStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    filterNode: FilterPattern,
    customFunctions: CustomFunctions,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    if ("operator" in filterNode.expression) {
      switch ((filterNode.expression as OperationExpression).operator) {
        case "exists":
          return exists(
            source,
            filterNode.expression.args,
            this.builder!,
            false,
            context
          );
        case "notexists":
          return exists(
            source,
            filterNode.expression.args,
            this.builder!,
            true,
            context
          );
      }
    }
    return sparqlFilter(source, filterNode.expression, customFunctions);
  }
}

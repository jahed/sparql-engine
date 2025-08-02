// SPDX-License-Identifier: MIT
import type { BindPattern } from "sparqljs";
import bind from "../../operators/bind.ts";
import type { CustomFunctions } from "../../operators/expressions/sparql-expression.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import StageBuilder from "./stage-builder.ts";

/**
 * A BindStageBuilder evaluates BIND clauses
 */
export default class BindStageBuilder extends StageBuilder {
  async execute(
    source: PipelineStage<Bindings>,
    bindNode: BindPattern,
    customFunctions: CustomFunctions,
    context: ExecutionContext
  ): Promise<PipelineStage<Bindings>> {
    return bind(
      source,
      bindNode.variable,
      bindNode.expression,
      customFunctions
    );
  }
}

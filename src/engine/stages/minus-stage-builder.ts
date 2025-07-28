// SPDX-License-Identifier: MIT
import StageBuilder from "./stage-builder.ts";

import type { GroupPattern } from "sparqljs";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import minus from "../../operators/minus.ts";
import { BindingBase, Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

/**
 * A MinusStageBuilder evaluates MINUS clauses
 */
export default class MinusStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    node: GroupPattern,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance();
    const rightSource = this.builder!._buildWhere(
      engine.of(new BindingBase()),
      node.patterns,
      context
    );
    return minus(source, rightSource);
  }
}

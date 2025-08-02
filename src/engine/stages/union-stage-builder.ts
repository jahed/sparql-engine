// SPDX-License-Identifier: MIT
import StageBuilder from "./stage-builder.ts";

import type { GroupPattern } from "sparqljs";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

/**
 * A UnionStageBuilder evaluates UNION clauses
 */
export default class UnionStageBuilder extends StageBuilder {
  async execute(
    source: PipelineStage<Bindings>,
    node: GroupPattern,
    context: ExecutionContext
  ): Promise<PipelineStage<Bindings>> {
    const results: PipelineStage<Bindings>[] = [];
    for (const patternToken of node.patterns) {
      results.push(
        await this.builder!._buildGroup(source, patternToken, context)
      );
    }
    return Pipeline.getInstance().merge(...results);
  }
}

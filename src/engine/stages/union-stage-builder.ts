// SPDX-License-Identifier: MIT
"use strict";

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
  execute(
    source: PipelineStage<Bindings>,
    node: GroupPattern,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    return Pipeline.getInstance().merge(
      ...node.patterns.map((patternToken) => {
        return this.builder!._buildGroup(source, patternToken, context);
      })
    );
  }
}

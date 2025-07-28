// SPDX-License-Identifier: MIT
"use strict";

import sparqlDistinct from "../../operators/sparql-distinct.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import StageBuilder from "./stage-builder.ts";

/**
 * A DistinctStageBuilder evaluates DISTINCT modifiers
 */
export default class DistinctStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    return sparqlDistinct(source);
  }
}

// SPDX-License-Identifier: MIT
"use strict";

import StageBuilder from "./stage-builder.ts";

import type { OptionalPattern } from "sparqljs";
import optional from "../../operators/optional.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

/**
 * A OptionalStageBuilder evaluates OPTIONAL clauses
 */
export default class OptionalStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    node: OptionalPattern,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    return optional(source, node.patterns, this.builder!, context);
  }
}

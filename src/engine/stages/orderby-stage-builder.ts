// SPDX-License-Identifier: MIT
"use strict";

import StageBuilder from "./stage-builder.ts";

import type { Ordering } from "sparqljs";
import orderby from "../../operators/orderby.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

/**
 * A OrderByStageBuilder evaluates ORDER BY clauses
 */
export default class OrderByStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    orders: Ordering[],
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    return orderby(source, orders);
  }
}

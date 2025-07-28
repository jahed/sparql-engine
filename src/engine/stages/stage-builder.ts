// SPDX-License-Identifier: MIT
"use strict";

import type { Bindings } from "../../rdf/bindings.ts";
import Dataset from "../../rdf/dataset.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import { PlanBuilder } from "../plan-builder.ts";

/**
 * A StageBuilder encapsulate a strategy for executing a class of SPARQL operations
 * @abstract
 */
export default abstract class StageBuilder {
  protected _builder: PlanBuilder | null = null;
  protected _dataset: Dataset;

  constructor(dataset: Dataset) {
    this._dataset = dataset;
  }

  get builder(): PlanBuilder | null {
    return this._builder;
  }

  set builder(builder: PlanBuilder | null) {
    this._builder = builder;
  }

  get dataset(): Dataset {
    return this._dataset;
  }

  set dataset(dataset: Dataset) {
    this._dataset = dataset;
  }

  abstract execute(...args: any[]): PipelineStage<Bindings>;
}

/* file : api.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

// stages builders
import { SPARQL_OPERATION } from "./engine/plan-builder.ts";
import AggregateStageBuilder from "./engine/stages/aggregate-stage-builder.ts";
import BGPStageBuilder from "./engine/stages/bgp-stage-builder.ts";
import BindStageBuilder from "./engine/stages/bind-stage-builder.ts";
import DistinctStageBuilder from "./engine/stages/distinct-stage-builder.ts";
import FilterStageBuilder from "./engine/stages/filter-stage-builder.ts";
import GlushkovStageBuilder from "./engine/stages/glushkov-executor/glushkov-stage-builder.ts";
import GraphStageBuilder from "./engine/stages/graph-stage-builder.ts";
import MinusStageBuilder from "./engine/stages/minus-stage-builder.ts";
import ServiceStageBuilder from "./engine/stages/service-stage-builder.ts";
import OptionalStageBuilder from "./engine/stages/optional-stage-builder.ts";
import OrderByStageBuilder from "./engine/stages/orderby-stage-builder.ts";
import UnionStageBuilder from "./engine/stages/union-stage-builder.ts";
import UpdateStageBuilder from "./engine/stages/update-stage-builder.ts";

const stages = {
  SPARQL_OPERATION,
  AggregateStageBuilder,
  BGPStageBuilder,
  BindStageBuilder,
  DistinctStageBuilder,
  FilterStageBuilder,
  GlushkovStageBuilder,
  GraphStageBuilder,
  MinusStageBuilder,
  ServiceStageBuilder,
  OptionalStageBuilder,
  OrderByStageBuilder,
  UnionStageBuilder,
  UpdateStageBuilder,
};

// base types
export { default as Dataset } from "./rdf/dataset.ts";
export { Bindings, BindingBase } from "./rdf/bindings.ts";
export { default as HashMapDataset } from "./rdf/hashmap-dataset.ts";
export { default as Graph } from "./rdf/graph.ts";
export { default as ExecutionContext } from "./engine/context/execution-context.ts";
export { PlanBuilder } from "./engine/plan-builder.ts";
// pipeline
export { Pipeline } from "./engine/pipeline/pipeline.ts";
export {
  PipelineEngine,
  type PipelineInput,
  type PipelineStage,
  type StreamPipelineInput,
} from "./engine/pipeline/pipeline-engine.ts";
export { default as RxjsPipeline } from "./engine/pipeline/rxjs-pipeline.ts";
export { default as VectorPipeline } from "./engine/pipeline/vector-pipeline.ts";
// RDF terms Utilities
export * as rdf from "./utils/rdf.ts";
// Formatters
export { default as JsonFormat } from "./formatters/json-formatter.ts";
export {
  csvFormatter as CSVFormat,
  tsvFormatter as TSVFormat,
} from "./formatters/csv-tsv-formatter.ts";

export { stages };

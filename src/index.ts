// SPDX-License-Identifier: MIT
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
import OptionalStageBuilder from "./engine/stages/optional-stage-builder.ts";
import OrderByStageBuilder from "./engine/stages/orderby-stage-builder.ts";
import ServiceStageBuilder from "./engine/stages/service-stage-builder.ts";
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
export { default as ExecutionContext } from "./engine/context/execution-context.ts";
export { PlanBuilder } from "./engine/plan-builder.ts";
export { BindingBase, Bindings } from "./rdf/bindings.ts";
export { default as Dataset } from "./rdf/dataset.ts";
export { default as Graph } from "./rdf/graph.ts";
export { default as HashMapDataset } from "./rdf/hashmap-dataset.ts";
// pipeline
export {
  PipelineEngine,
  type PipelineInput,
  type PipelineStage,
  type StreamPipelineInput,
} from "./engine/pipeline/pipeline-engine.ts";
export { Pipeline } from "./engine/pipeline/pipeline.ts";
export { default as RxjsPipeline } from "./engine/pipeline/rxjs-pipeline.ts";
export { default as VectorPipeline } from "./engine/pipeline/vector-pipeline.ts";
// RDF terms Utilities
export * as rdf from "./utils/rdf.ts";
// Formatters
export {
  csvFormatter as CSVFormat,
  tsvFormatter as TSVFormat,
} from "./formatters/csv-tsv-formatter.ts";
export { default as JsonFormat } from "./formatters/json-formatter.ts";

export { stages };

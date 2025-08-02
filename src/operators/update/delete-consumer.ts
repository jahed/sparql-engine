// SPDX-License-Identifier: MIT
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import Graph from "../../rdf/graph.ts";
import type { EngineTriple } from "../../types.ts";
import { Consumer } from "./consumer.ts";

export default class DeleteConsumer<T> extends Consumer<T> {
  private readonly _graph: Graph;

  constructor(source: PipelineStage<EngineTriple>, graph: Graph) {
    super(source);
    this._graph = graph;
  }

  onData(triple: EngineTriple): Promise<void> {
    return this._graph.delete(triple);
  }
}

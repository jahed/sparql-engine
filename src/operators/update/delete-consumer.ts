"use strict";

import type { Algebra } from "sparqljs";
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import Graph from "../../rdf/graph.ts";
import { Consumer } from "./consumer.ts";

export default class DeleteConsumer<T> extends Consumer<T> {
  private readonly _graph: Graph;

  constructor(
    source: PipelineStage<Algebra.TripleObject>,
    graph: Graph,
  ) {
    super(source);
    this._graph = graph;
  }

  onData(triple: Algebra.TripleObject): Promise<void> {
    return this._graph.delete(triple);
  }
}

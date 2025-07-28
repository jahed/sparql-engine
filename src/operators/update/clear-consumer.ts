// SPDX-License-Identifier: MIT
import Graph from "../../rdf/graph.ts";
import { Consumable } from "./consumer.ts";

/**
 * Clear all RDF triples in a RDF Graph
 */
export default class ClearConsumer<T> extends Consumable<T> {
  private readonly _graph: Graph;

  /**
   * Consuctor
   * @param graph - Input RDF Graph
   */
  constructor(graph: Graph) {
    super();
    this._graph = graph;
  }

  execute(): Promise<void> {
    return this._graph.clear();
  }
}

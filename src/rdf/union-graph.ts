// SPDX-License-Identifier: MIT
import { termToString } from "rdf-string";
import ExecutionContext from "../engine/context/execution-context.ts";
import type { PipelineInput } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import type { EngineTriple } from "../types.ts";
import { RDF } from "../utils/rdf.ts";
import Graph from "./graph.ts";

/**
 * An UnionGraph represents the dynamic union of several graphs.
 * Addition only affects the left-most operand, deletion affects all graphs.
 * Searching for RDF triple smatching a triple pattern in such Graph is equivalent
 * as the Union of matching RDF triples in all graphs.
 * @extends Graph
 */
export default class UnionGraph extends Graph {
  public readonly _graphs: Graph[]; // Public for tests.

  /**
   * Constructor
   * @param graphs - Set of RDF graphs
   */
  constructor(graphs: Graph[]) {
    super();
    this.iri = RDF.namedNode(graphs.map((g) => termToString(g.iri)).join("+"));
    this._graphs = graphs;
  }

  insert(triple: EngineTriple): Promise<void> {
    return this._graphs[0].insert(triple);
  }

  delete(triple: EngineTriple): Promise<void> {
    return this._graphs.reduce(
      (prev, g) => prev.then(() => g.delete(triple)),
      Promise.resolve()
    );
  }

  find(
    triple: EngineTriple,
    context: ExecutionContext
  ): PipelineInput<EngineTriple> {
    return Pipeline.getInstance().merge(
      ...this._graphs.map((g) => g.find(triple, context))
    );
  }

  clear(): Promise<void> {
    return this._graphs.reduce(
      (prev, g) => prev.then(() => g.clear()),
      Promise.resolve()
    );
  }

  estimateCardinality(triple: EngineTriple): Promise<number> {
    return Promise.all(
      this._graphs.map((g) => g.estimateCardinality(triple))
    ).then((cardinalities: number[]) => {
      return Promise.resolve(cardinalities.reduce((acc, x) => acc + x, 0));
    });
  }
}

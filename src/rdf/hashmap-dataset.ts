// SPDX-License-Identifier: MIT
import { termToString } from "rdf-string";
import type { IriTerm } from "sparqljs";
import Dataset from "./dataset.ts";
import Graph from "./graph.ts";

/**
 * A simple Dataset backed by a HashMap.
 * @extends Dataset
 */
export default class HashMapDataset<
  TGraph extends Graph = Graph,
> extends Dataset<TGraph> {
  private _defaultGraph: TGraph;
  private readonly _namedGraphs: Map<string, TGraph>;
  /**
   * Constructor
   * @param defaultGraphIRI - IRI of the Default Graph
   * @param defaultGraph     - Default Graph
   */
  constructor(defaultGraph: TGraph) {
    super();
    this._defaultGraph = defaultGraph;
    this._namedGraphs = new Map();
  }

  get iris(): IriTerm[] {
    return Array.from(this._namedGraphs.values().map((g) => g.iri));
  }

  setDefaultGraph(graph: TGraph): void {
    this._defaultGraph = graph;
  }

  getDefaultGraph(): TGraph {
    return this._defaultGraph;
  }

  addNamedGraph(graph: TGraph): void {
    this._namedGraphs.set(termToString(graph.iri), graph);
  }

  async getNamedGraph(iri: IriTerm): Promise<TGraph> {
    if (iri.equals(this._defaultGraph.iri)) {
      return this.getDefaultGraph();
    }
    const key = termToString(iri);
    if (!this._namedGraphs.has(key)) {
      const graph = await this.createGraph(iri);
      this._namedGraphs.set(key, graph);
      return graph;
    }
    return this._namedGraphs.get(key)!;
  }

  hasNamedGraph(iri: IriTerm): boolean {
    return this._namedGraphs.has(termToString(iri));
  }

  deleteNamedGraph(iri: IriTerm): void {
    const key = termToString(iri);
    if (this._namedGraphs.has(key)) {
      this._namedGraphs.delete(key);
    } else {
      throw new Error(`Cannot delete unknown graph with iri ${key}`);
    }
  }
}

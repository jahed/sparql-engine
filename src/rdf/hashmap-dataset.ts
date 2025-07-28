// SPDX-License-Identifier: MIT
"use strict";

import { termToString } from "rdf-string";
import type { IriTerm } from "sparqljs";
import Dataset from "./dataset.ts";
import Graph from "./graph.ts";

/**
 * A simple Dataset backed by a HashMap.
 * @extends Dataset
 */
export default class HashMapDataset<
  G extends Graph = Graph,
> extends Dataset<G> {
  private _defaultGraph: G;
  private readonly _namedGraphs: Map<string, G>;
  /**
   * Constructor
   * @param defaultGraphIRI - IRI of the Default Graph
   * @param defaultGraph     - Default Graph
   */
  constructor(defaultGraphIRI: IriTerm, defaultGraph: G) {
    super();
    defaultGraph.iri = defaultGraphIRI;
    this._defaultGraph = defaultGraph;
    this._namedGraphs = new Map();
  }

  get iris(): IriTerm[] {
    return Array.from(this._namedGraphs.values().map((g) => g.iri));
  }

  setDefaultGraph(g: G): void {
    this._defaultGraph = g;
  }

  getDefaultGraph(): G {
    return this._defaultGraph;
  }

  addNamedGraph(iri: IriTerm, g: G): void {
    g.iri = iri;
    this._namedGraphs.set(termToString(iri), g);
  }

  getNamedGraph(iri: IriTerm): G {
    if (iri.equals(this._defaultGraph.iri)) {
      return this.getDefaultGraph();
    }
    const key = termToString(iri);
    if (!this._namedGraphs.has(key)) {
      throw new Error(`Unknown graph with iri ${key}`);
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

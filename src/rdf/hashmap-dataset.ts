/*
MIT License

Copyright (c) 2025 The SPARQL Engine Authors.

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

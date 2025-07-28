// SPDX-License-Identifier: MIT
"use strict";

import type { IriTerm } from "sparqljs";
import Graph from "./graph.ts";
import UnionGraph from "./union-graph.ts";

/**
 * An abstraction over an RDF datasets, i.e., a collection of RDF graphs.
 * @abstract
 */
export default abstract class Dataset<G extends Graph = Graph> {
  private _graphFactory: (iri: IriTerm) => G | null;

  /**
   * Constructor
   */
  constructor() {
    this._graphFactory = () => null;
  }

  abstract get iris(): IriTerm[];
  /**
   * Set the Default Graph of the Dataset
   * @param g - Default Graph
   */
  abstract setDefaultGraph(g: G): void;

  /**
   * Get the Default Graph of the Dataset
   * @return The Default Graph of the Dataset
   */
  abstract getDefaultGraph(): G;

  /**
   * Add a Named Graph to the Dataset
   * @param iri - IRI of the Named Graph
   * @param g   - RDF Graph
   */
  abstract addNamedGraph(iri: IriTerm, g: G): void;

  /**
   * Get a Named Graph using its IRI
   * @param  iri - IRI of the Named Graph to retrieve
   * @return The corresponding Named Graph
   */
  abstract getNamedGraph(iri: IriTerm): G;

  /**
   * Delete a Named Graph using its IRI
   * @param  iri - IRI of the Named Graph to delete
   */
  abstract deleteNamedGraph(iri: IriTerm): void;

  /**
   * Return True if the Dataset contains a Named graph with the provided IRI
   * @param  iri - IRI of the Named Graph
   * @return True if the Dataset contains a Named graph with the provided IRI
   */
  abstract hasNamedGraph(iri: IriTerm): boolean;

  /**
   * Get an UnionGraph, i.e., the dynamic union of several graphs,
   * from the RDF Graphs in the Dataset.
   * @param  iris           - Iris of the named graphs to include in the union
   * @param  includeDefault - True if the default graph should be included
   * @return The dynamic union of several graphs in the Dataset
   */
  getUnionGraph(iris: IriTerm[], includeDefault: boolean = false): UnionGraph {
    let graphs: G[] = [];
    if (includeDefault) {
      graphs.push(this.getDefaultGraph());
    }
    graphs = graphs.concat(iris.map((iri) => this.getNamedGraph(iri)));
    return new UnionGraph(graphs);
  }

  /**
   * Returns all Graphs in the Dataset, including the Default one
   * @param  includeDefault - True if the default graph should be included
   * @return The list of all graphs in the Dataset
   */
  getAllGraphs(includeDefault: boolean = true): G[] {
    const graphs: G[] = [];
    if (includeDefault) {
      graphs.push(this.getDefaultGraph());
    }
    this.iris.forEach((iri) => {
      graphs.push(this.getNamedGraph(iri));
    });
    return graphs;
  }

  /**
   * Set the Graph Factory used by te dataset to create new RDF graphs on-demand
   * @param  factory - Graph Factory
   */
  setGraphFactory(factory: (iri: IriTerm) => G) {
    this._graphFactory = factory;
  }

  /**
   * Create a new RDF Graph, using the current Graph Factory.
   * This Graph factory can be set using the "setGraphFactory" method.
   * @param  iri - IRI of the graph to create
   * @return A new RDF Graph
   */
  createGraph(iri: IriTerm): G {
    const graph = this._graphFactory(iri);
    if (graph === null) {
      throw new Error(
        `Impossible to create a new Graph with IRI "${iri}". The RDF dataset does not seems to have a graph factory. Please set it using the "setGraphFactory" method.`
      );
    }
    return graph;
  }
}

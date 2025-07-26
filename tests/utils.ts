/* file : utils.js
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

import fs from "fs";
import { isArray, pick } from "lodash-es";
import n3 from "n3";
import type { Algebra } from "sparqljs";
import {
  ExecutionContext,
  Graph,
  HashMapDataset,
  Pipeline,
  type PipelineStage,
  PlanBuilder,
} from "../src/api.ts";
import type { QueryOutput } from "../src/engine/plan-builder.ts";
import type { CustomFunctions } from "../src/operators/expressions/sparql-expression.ts";

const { Parser, Store } = n3;

export type TestGraph = N3Graph | UnionN3Graph;

export function getGraph(
  filePaths?: string | string[] | null,
  isUnion = false
) {
  let graph: TestGraph;
  if (isUnion) {
    graph = new UnionN3Graph();
  } else {
    graph = new N3Graph();
  }
  if (typeof filePaths === "string") {
    graph.parse(filePaths);
  } else if (isArray(filePaths)) {
    filePaths.forEach((filePath) => graph.parse(filePath));
  }
  return graph;
}

function formatTriplePattern(triple: Algebra.TripleObject) {
  let subject = null;
  let predicate = null;
  let object = null;
  if (!triple.subject.startsWith("?")) {
    subject = triple.subject;
  }
  if (!triple.predicate.startsWith("?")) {
    predicate = triple.predicate;
  }
  if (!triple.object.startsWith("?")) {
    object = triple.object;
  }
  return { subject, predicate, object };
}

export class N3Graph extends Graph {
  public readonly _store: n3.N3StoreWriter;
  public readonly _parser: n3.N3Parser;

  constructor() {
    super();
    this._store = Store()!;
    this._parser = Parser()!;
  }

  parse(file: string) {
    const content = fs.readFileSync(file).toString("utf-8");
    this._parser.parse(content)?.forEach((t) => {
      this._store.addTriple(t);
    });
  }

  insert(triple: Algebra.TripleObject) {
    return new Promise<void>((resolve, reject) => {
      try {
        this._store.addTriple(triple.subject, triple.predicate, triple.object);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  delete(triple: Algebra.TripleObject) {
    return new Promise<void>((resolve, reject) => {
      try {
        this._store.removeTriple(
          triple.subject,
          triple.predicate,
          triple.object
        );
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  find(triple: Algebra.TripleObject) {
    const { subject, predicate, object } = formatTriplePattern(triple);
    return this._store.getTriples(subject, predicate, object).map((t) => {
      return pick(t, ["subject", "predicate", "object"]);
    });
  }

  estimateCardinality(triple: Algebra.TripleObject) {
    const { subject, predicate, object } = formatTriplePattern(triple);
    return Promise.resolve(
      this._store.countTriples(subject, predicate, object)
    );
  }

  clear() {
    const triples = this._store.getTriples(null, null, null);
    this._store.removeTriples(triples);
    return Promise.resolve();
  }
}

class UnionN3Graph extends N3Graph {
  constructor() {
    super();
  }

  evalUnion(patterns: Algebra.TripleObject[][], context: ExecutionContext) {
    return Pipeline.getInstance().merge(
      ...patterns.map((pattern) => this.evalBGP(pattern, context))
    );
  }
}

export class TestEngine<G extends Graph = TestGraph> {
  public readonly _graph: G;
  public readonly _defaultGraphIRI: string;
  public readonly _dataset: HashMapDataset<G>;
  public readonly _builder: PlanBuilder;

  constructor(
    graph: G,
    defaultGraphIRI?: string,
    customOperations: CustomFunctions = {}
  ) {
    this._graph = graph;
    this._defaultGraphIRI = defaultGraphIRI || this._graph.iri;
    this._dataset = new HashMapDataset(this._defaultGraphIRI, this._graph);
    this._builder = new PlanBuilder(this._dataset, {}, customOperations);
  }

  defaultGraphIRI() {
    return this._dataset.getDefaultGraph().iri;
  }

  addNamedGraph(iri: string, db: G) {
    this._dataset.addNamedGraph(iri, db);
  }

  getNamedGraph(iri: string): G {
    return this._dataset.getNamedGraph(iri);
  }

  hasNamedGraph(iri: string) {
    return this._dataset.hasNamedGraph(iri);
  }

  execute(query: string | Algebra.RootNode): PipelineStage<QueryOutput> {
    return this._builder.build(query);
  }
}

// SPDX-License-Identifier: MIT
import fs from "fs";
import { isArray } from "lodash-es";
import n3 from "n3";
import type { NamedNode } from "rdf-data-factory";
import { stringQuadToQuad, termToString } from "rdf-string";
import type { Query } from "sparqljs";
import type ExecutionContext from "../src/engine/context/execution-context.ts";
import type { PipelineStage } from "../src/engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../src/engine/pipeline/pipeline.ts";
import { PlanBuilder, type QueryOutput } from "../src/engine/plan-builder.ts";
import type { CustomFunctions } from "../src/operators/expressions/sparql-expression.ts";
import Graph from "../src/rdf/graph.ts";
import HashMapDataset from "../src/rdf/hashmap-dataset.ts";
import type { EngineIRI, EngineTriple } from "../src/types.ts";
import { isVariable } from "../src/utils/rdf.ts";

const { Parser, Store } = n3;

export type TestGraph = N3Graph | UnionN3Graph;

export function createGraph(
  filePaths?: string | string[],
  isUnion = false,
  iri?: NamedNode
) {
  let graph: TestGraph;
  if (isUnion) {
    graph = new UnionN3Graph(iri);
  } else {
    graph = new N3Graph(iri);
  }
  if (typeof filePaths === "string") {
    graph.parse(filePaths);
  } else if (isArray(filePaths)) {
    filePaths.forEach((filePath) => graph.parse(filePath));
  }
  return graph;
}

function formatTriplePattern(triple: EngineTriple) {
  let subject = null;
  let predicate = null;
  let object = null;
  if (!isVariable(triple.subject)) {
    subject = triple.subject;
  }
  if (!isVariable(triple.predicate)) {
    predicate = triple.predicate;
  }
  if (!isVariable(triple.object)) {
    object = triple.object;
  }
  return { subject, predicate, object };
}

export class N3Graph extends Graph {
  public readonly _store: n3.N3StoreWriter;
  public readonly _parser: n3.N3Parser;

  constructor(iri?: NamedNode) {
    super(iri);
    this._store = Store()!;
    this._parser = Parser()!;
  }

  parse(file: string) {
    const content = fs.readFileSync(file).toString("utf-8");
    this._parser.parse(content)?.forEach((t) => {
      this._store.addTriple(t);
    });
  }

  insert(triple: EngineTriple) {
    return new Promise<void>((resolve, reject) => {
      try {
        this._store.addTriple(
          termToString(triple.subject),
          termToString(triple.predicate),
          termToString(triple.object)
        );
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  delete(triple: EngineTriple) {
    return new Promise<void>((resolve, reject) => {
      try {
        this._store.removeTriple(
          termToString(triple.subject),
          termToString(triple.predicate),
          termToString(triple.object)
        );
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  find(triple: EngineTriple) {
    const { subject, predicate, object } = formatTriplePattern(triple);
    return this._store
      .getTriples(
        termToString(subject),
        termToString(predicate),
        termToString(object)
      )
      .map((t) => stringQuadToQuad(t));
  }

  estimateCardinality(triple: EngineTriple) {
    const { subject, predicate, object } = formatTriplePattern(triple);
    return Promise.resolve(
      this._store.countTriples(
        termToString(subject),
        termToString(predicate),
        termToString(object)
      )
    );
  }

  clear() {
    const triples = this._store.getTriples(null, null, null);
    this._store.removeTriples(triples);
    return Promise.resolve();
  }
}

class UnionN3Graph extends N3Graph {
  constructor(iri?: NamedNode) {
    super(iri);
  }

  evalUnion(patterns: EngineTriple[][], context: ExecutionContext) {
    return Pipeline.getInstance().merge(
      ...patterns.map((pattern) => this.evalBGP(pattern, context))
    );
  }
}

export class TestEngine<G extends Graph = TestGraph> {
  public readonly _dataset: HashMapDataset<G>;
  public readonly _builder: PlanBuilder;

  constructor(graph: G, customOperations: CustomFunctions = {}) {
    this._dataset = new HashMapDataset(graph);
    this._builder = new PlanBuilder(this._dataset, {}, customOperations);
  }

  defaultGraphIRI() {
    return this._dataset.getDefaultGraph().iri;
  }

  addNamedGraph(graph: G) {
    this._dataset.addNamedGraph(graph);
  }

  getNamedGraph(iri: EngineIRI): G {
    return this._dataset.getNamedGraph(iri);
  }

  hasNamedGraph(iri: EngineIRI) {
    return this._dataset.hasNamedGraph(iri);
  }

  execute(query: string | Query): PipelineStage<QueryOutput> {
    return this._builder.build(query);
  }
}

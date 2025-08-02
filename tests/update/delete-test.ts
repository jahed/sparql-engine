// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine, type TestGraph } from "../utils.ts";

describe("SPARQL UPDATE: DELETE DATA queries", () => {
  const GRAPH_IRI = RDF.namedNode("http://example.org#some-graph");

  let engine: TestEngine;
  let gA: TestGraph;
  beforeEach(() => {
    gA = createGraph();
    const gB = createGraph(undefined, undefined, GRAPH_IRI);
    engine = new TestEngine(gA);
    engine.addNamedGraph(gB);
  });

  it("should evaluate DELETE DATA queries without a named Graph", async () => {
    const query = `
    DELETE DATA {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
    }`;

    gA._store.addTriple(
      "https://dblp.org/pers/m/Minier:Thomas",
      "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf",
      "https://dblp.org/rec/conf/esws/MinierSMV18a"
    );

    for await (const b of engine.execute(query)) {
    }
    const triples = gA._store.getTriples(
      "https://dblp.org/pers/m/Minier:Thomas",
      "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf",
      "https://dblp.org/rec/conf/esws/MinierSMV18a"
    );
    expect(triples.length).to.equal(0);
  });

  it("should evaluate DELETE DATA queries using a named Graph", async () => {
    const query = `
    DELETE DATA {
      GRAPH <${termToString(GRAPH_IRI)}> {
        <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf> <https://dblp.org/rec/conf/esws/MinierSMV18a>
      }
    }`;
    engine
      .getNamedGraph(GRAPH_IRI)
      ._store.addTriple(
        "https://dblp.org/pers/m/Minier:Thomas",
        "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf",
        "https://dblp.org/rec/conf/esws/MinierSMV18a"
      );

    for await (const b of engine.execute(query)) {
    }
    const triples = engine
      .getNamedGraph(GRAPH_IRI)
      ._store.getTriples(
        "https://dblp.org/pers/m/Minier:Thomas",
        "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf",
        "https://dblp.org/rec/conf/esws/MinierSMV18a"
      );
    expect(triples.length).to.equal(0);
  });
});

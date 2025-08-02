// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine, type TestGraph } from "../utils.ts";

describe("SPARQL UPDATE: ADD queries", () => {
  const GRAPH_A_IRI = RDF.namedNode("http://example.org#some-graph-a");
  const GRAPH_B_IRI = RDF.namedNode("http://example.org#some-graph-b");

  let engine: TestEngine;
  let gA: TestGraph;
  beforeEach(() => {
    gA = createGraph("./tests/data/dblp.nt", undefined, GRAPH_A_IRI);
    const gB = createGraph("./tests/data/dblp2.nt", undefined, GRAPH_B_IRI);
    engine = new TestEngine(gA);
    engine.addNamedGraph(gB);
  });

  const data = [
    {
      name: "ADD DEFAULT to NAMED",
      query: `ADD DEFAULT TO <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        const triples = engine
          .getNamedGraph(GRAPH_B_IRI)
          ._store.getTriples("https://dblp.org/pers/m/Minier:Thomas");
        expect(triples.length).to.equal(11);
      },
    },
    {
      name: "ADD NAMED to DEFAULT",
      query: `ADD <${termToString(GRAPH_B_IRI)}> TO DEFAULT`,
      testFun: () => {
        const triples = gA._store.getTriples(
          "https://dblp.org/pers/g/Grall:Arnaud"
        );
        expect(triples.length).to.equal(10);
      },
    },
  ];

  data.forEach((d) => {
    it(`should evaluate "${d.name}" queries`, async () => {
      for await (const b of engine.execute(d.query)) {
      }
      d.testFun();
    });
  });
});

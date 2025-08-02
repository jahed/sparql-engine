// SPDX-License-Identifier: MIT
import { RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createGraph, TestEngine, type TestGraph } from "../utils.ts";

describe("SPARQL UPDATE: COPY queries", () => {
  const GRAPH_A_IRI = RDF.namedNode("http://example.org#some-graph-a");
  const GRAPH_B_IRI = RDF.namedNode("http://example.org#some-graph-b");

  let engine: TestEngine;
  let gA: TestGraph;
  let gB: TestGraph;
  beforeEach(() => {
    gA = createGraph("./tests/data/dblp.nt", undefined, GRAPH_A_IRI);
    gB = createGraph("./tests/data/dblp2.nt", undefined, GRAPH_B_IRI);
    engine = new TestEngine(gA);
    engine.addNamedGraph(gB);
  });

  const data = [
    {
      name: "COPY DEFAULT to NAMED",
      query: `COPY DEFAULT TO <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        // destination graph should only contains data from the source
        let triples = gB._store.getTriples(
          "https://dblp.org/pers/m/Minier:Thomas"
        );
        expect(triples.length).to.equal(11);
        triples = gB._store.getTriples("https://dblp.org/pers/g/Grall:Arnaud");
        expect(triples.length).to.equal(0);
        // source graph should not be empty
        triples = gA._store.getTriples();
        expect(triples.length).to.not.equal(0);
      },
    },
    {
      name: "COPY NAMED to DEFAULT",
      query: `COPY <${termToString(GRAPH_B_IRI)}> TO DEFAULT`,
      testFun: () => {
        // destination graph should only contains data from the source
        let triples = gA._store.getTriples(
          "https://dblp.org/pers/g/Grall:Arnaud"
        );
        expect(triples.length).to.equal(10);
        triples = gA._store.getTriples("https://dblp.org/pers/m/Minier:Thomas");
        expect(triples.length).to.equal(0);
        // source graph should not be empty
        triples = gB._store.getTriples();
        expect(triples.length).to.not.equal(0);
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

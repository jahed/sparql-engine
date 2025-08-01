// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createIRI } from "../../src/utils/rdf.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SPARQL UPDATE: COPY queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("dblp.nt");
    const gB = getGraph("dblp2.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine.addNamedGraph(GRAPH_B_IRI, gB);
  });

  const data = [
    {
      name: "COPY DEFAULT to NAMED",
      query: `COPY DEFAULT TO <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        // destination graph should only contains data from the source
        let triples = engine
          .getNamedGraph(GRAPH_B_IRI)
          ._store.getTriples("https://dblp.org/pers/m/Minier:Thomas");
        expect(triples.length).to.equal(11);
        triples = engine
          .getNamedGraph(GRAPH_B_IRI)
          ._store.getTriples("https://dblp.org/pers/g/Grall:Arnaud");
        expect(triples.length).to.equal(0);
        // source graph should not be empty
        triples = engine._graph._store.getTriples();
        expect(triples.length).to.not.equal(0);
      },
    },
    {
      name: "COPY NAMED to DEFAULT",
      query: `COPY <${termToString(GRAPH_B_IRI)}> TO DEFAULT`,
      testFun: () => {
        // destination graph should only contains data from the source
        let triples = engine._graph._store.getTriples(
          "https://dblp.org/pers/g/Grall:Arnaud"
        );
        expect(triples.length).to.equal(10);
        triples = engine._graph._store.getTriples(
          "https://dblp.org/pers/m/Minier:Thomas"
        );
        expect(triples.length).to.equal(0);
        // source graph should not be empty
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
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

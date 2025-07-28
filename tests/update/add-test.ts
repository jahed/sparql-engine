// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createIRI } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SPARQL UPDATE: ADD queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("./tests/data/dblp.nt");
    const gB = getGraph("./tests/data/dblp2.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine.addNamedGraph(GRAPH_B_IRI, gB);
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
        const triples = engine._graph._store.getTriples(
          "https://dblp.org/pers/g/Grall:Arnaud"
        );
        expect(triples.length).to.equal(10);
      },
    },
  ];

  data.forEach((d) => {
    it(`should evaluate "${d.name}" queries`, (t, done) => {
      engine.execute(d.query).subscribe(undefined, done, () => {
        d.testFun();
        done();
      });
    });
  });
});

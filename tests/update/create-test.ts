// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createIRI } from "../../src/utils/rdf.ts";
import { getGraph, N3Graph, TestEngine } from "../utils.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SPARQL UPDATE: CREATE queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine._dataset.setGraphFactory((iri) => new N3Graph());
  });

  const data = [
    {
      name: "CREATE GRAPH",
      query: `CREATE GRAPH <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        expect(engine.hasNamedGraph(GRAPH_B_IRI)).to.equal(true);
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

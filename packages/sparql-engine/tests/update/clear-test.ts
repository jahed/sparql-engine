// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createIRI } from "../../src/utils/rdf.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SPARQL UPDATE: CLEAR queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("dblp.nt");
    const gB = getGraph("dblp2.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine.addNamedGraph(GRAPH_B_IRI, gB);
  });

  const data = [
    {
      name: "CLEAR DEFAULT",
      query: "CLEAR DEFAULT",
      testFun: () => {
        const triples = engine._graph._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
    {
      name: "CLEAR ALL",
      query: "CLEAR ALL",
      testFun: () => {
        let triples = engine._graph._store.getTriples();
        expect(triples.length).to.equal(0);
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
    {
      name: "CLEAR NAMED",
      query: "CLEAR NAMED",
      testFun: () => {
        let triples = engine._graph._store.getTriples();
        expect(triples.length).to.not.equal(0);
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
    {
      name: "CLEAR GRAPH",
      query: `CLEAR GRAPH <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        let triples = engine._graph._store.getTriples();
        expect(triples.length).to.not.equal(0);
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
  ];

  data.forEach((d) => {
    it(`should evaluate ${d.name} queries`, async () => {
      for await (const b of engine.execute(d.query)) {
      }
      d.testFun();
    });
  });
});

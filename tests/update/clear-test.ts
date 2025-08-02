// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine, type TestGraph } from "../utils.ts";

describe("SPARQL UPDATE: CLEAR queries", () => {
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
      name: "CLEAR DEFAULT",
      query: "CLEAR DEFAULT",
      testFun: () => {
        const triples = gA._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
    {
      name: "CLEAR ALL",
      query: "CLEAR ALL",
      testFun: () => {
        let triples = gA._store.getTriples();
        expect(triples.length).to.equal(0);
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
    {
      name: "CLEAR NAMED",
      query: "CLEAR NAMED",
      testFun: () => {
        let triples = gA._store.getTriples();
        expect(triples.length).to.not.equal(0);
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
        expect(triples.length).to.equal(0);
      },
    },
    {
      name: "CLEAR GRAPH",
      query: `CLEAR GRAPH <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        let triples = gA._store.getTriples();
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

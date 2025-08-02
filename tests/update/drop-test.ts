// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine } from "../utils.ts";

const GRAPH_A_IRI = RDF.namedNode("http://example.org#some-graph-a");
const GRAPH_B_IRI = RDF.namedNode("http://example.org#some-graph-b");

describe("SPARQL UPDATE: DROP queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = createGraph("./tests/data/dblp.nt", undefined, GRAPH_A_IRI);
    const gB = createGraph("./tests/data/dblp.nt", undefined, GRAPH_B_IRI);
    engine = new TestEngine(gA);
    engine.addNamedGraph(gB);
  });

  const data = [
    {
      name: "DROP GRAPH",
      query: `DROP GRAPH <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        expect(engine.hasNamedGraph(GRAPH_B_IRI)).to.equal(false);
      },
    },
    {
      name: "DROP DEFAULT",
      query: `DROP DEFAULT`,
      testFun: () => {
        expect(engine.hasNamedGraph(GRAPH_A_IRI)).to.equal(false);
        expect(engine.defaultGraphIRI()).to.equal(GRAPH_B_IRI);
      },
    },
    {
      name: "DROP ALL",
      query: `DROP ALL`,
      testFun: () => {
        expect(engine._dataset.iris.length).to.equal(0);
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

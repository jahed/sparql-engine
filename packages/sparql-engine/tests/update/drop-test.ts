// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createIRI } from "../../src/utils/rdf.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SPARQL UPDATE: DROP queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("dblp.nt");
    const gB = getGraph("dblp.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine.addNamedGraph(GRAPH_B_IRI, gB);
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

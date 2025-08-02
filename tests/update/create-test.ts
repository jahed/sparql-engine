// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, N3Graph, TestEngine } from "../utils.ts";

describe("SPARQL UPDATE: CREATE queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const defaultGraph = createGraph(
      "./tests/data/dblp.nt",
      undefined,
      RDF.namedNode("http://example.org#some-graph-a")
    );
    engine = new TestEngine(defaultGraph);
    engine._dataset.setGraphFactory((iri) => new N3Graph(iri));
  });

  const createdGraphIri = RDF.namedNode("http://example.org#create-graph-iri");

  const data = [
    {
      name: "CREATE GRAPH",
      query: `CREATE GRAPH <${termToString(createdGraphIri)}>`,
      testFun: () => {
        expect(engine.hasNamedGraph(createdGraphIri)).to.equal(true);
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

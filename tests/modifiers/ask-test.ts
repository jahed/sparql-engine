// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { before, describe, it } from "node:test";
import { createGraph, TestEngine } from "../utils.ts";

describe("SPARQL ASK queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate ASK queries that evaluates to true", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    ASK WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    const results = [];
    for await (const b of engine.execute(query)) {
      expect(b).to.equal(true);
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should evaluate ASK queries that evaluates to false", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    ASK WHERE {
      ?s rdf:type rdf:People .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    const results = [];
    for await (const b of engine.execute(query)) {
      expect(b).to.equal(false);
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });
});

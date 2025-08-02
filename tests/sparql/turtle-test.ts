// SPDX-License-Identifier: MIT
import { Bindings } from "@jahed/sparql-engine/rdf/bindings.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { createGraph, TestEngine } from "../utils.ts";

describe("Queries with Turtle notation", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate SPARQL queries with Turtle notation", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      <https://dblp.uni-trier.de/pers/m/Minier:Thomas> <http://www.w3.org/2002/07/owl#sameAs> [
        rdf:type dblp-rdf:Person ;
        dblp-rdf:primaryFullPersonName ?name ;
        dblp-rdf:authorOf ?article
      ] .
    }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("name", "article");
      results.push(b);
    }
    expect(results.length).to.equal(5);
  });
});

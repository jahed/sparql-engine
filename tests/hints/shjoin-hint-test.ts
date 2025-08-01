// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { BindingBase } from "../../src/rdf/bindings.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SELECT SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should accept SymmetricHashJoin hints", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX hint: <http://callidon.github.io/sparql-engine/hints#>
    SELECT ?name ?article WHERE {
      hint:Group hint:SymmetricHashJoin true.
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof BindingBase);
      const b = bindings.toObject();
      expect(b).to.have.keys("name", "article");
      results.push(b);
    }
    expect(results.length).to.equal(5);
  });
});

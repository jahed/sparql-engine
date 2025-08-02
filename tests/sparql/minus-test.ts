// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import {
  BindingBase,
  Bindings,
  type BindingsRecord,
} from "../../src/rdf/bindings.ts";
import { RDF } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL MINUS", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate SPARQL queries with MINUS clauses", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s ?p ?o .
      MINUS { ?s rdf:type dblp-rdf:Person . }
    }`;
    let nbResults = 0;
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "p", "o");
      expect(b["s"]).to.be.deep.oneOf([
        RDF.namedNode("https://dblp.uni-trier.de/pers/m/Minier:Thomas"),
        RDF.namedNode("https://dblp.org/pers/m/Minier:Thomas.nt"),
      ]);
      nbResults++;
    }
    expect(nbResults).to.equal(6);
  });

  it("should evaluate SPARQL queries with MINUS clauses that found nothing", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      MINUS { ?s dblp-rdf:primaryFullPersonName ?name }
    }`;
    const results: BindingsRecord[] = [];
    for await (const b of engine.execute(query)) {
      assert.ok(b instanceof BindingBase);
      results.push(b.toObject());
    }
    expect(results).to.deep.equal([]);
  });
});

// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SELECT SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate simple SELECT SPARQL queries", (t, done) => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("name", "article");
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(5);
        done();
      }
    );
  });

  it("should evaluate SELECT * queries", (t, done) => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("name", "article", "s");
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(5);
        done();
      }
    );
  });

  it("should evaluate SELECT DISTINCT queries", (t, done) => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT DISTINCT ?name WHERE {
      {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
      } UNION {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
      }
    }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("name");
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        done();
      }
    );
  });
});

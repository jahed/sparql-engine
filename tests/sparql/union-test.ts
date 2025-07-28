// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL UNION", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate UNION queries", (t, done) => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name WHERE {
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
        expect(results.length).to.equal(2);
        done();
      }
    );
  });
});

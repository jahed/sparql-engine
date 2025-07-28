// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import { before, describe, it } from "node:test";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL ASK queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate ASK queries that evaluates to true", (t, done) => {
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
    const iterator = engine.execute(query);
    iterator.subscribe(
      (b) => {
        expect(b).to.equal(true);
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        done();
      }
    );
  });

  it("should evaluate ASK queries that evaluates to false", (t, done) => {
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
    const iterator = engine.execute(query);
    iterator.subscribe(
      (b) => {
        expect(b).to.equal(false);
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

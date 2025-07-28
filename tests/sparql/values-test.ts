// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { createIRI } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL VALUES", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluates VALUES clauses", (t, done) => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX esws: <https://dblp.org/rec/conf/esws/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
      VALUES ?article { esws:MinierSMV18a esws:MinierMSM17 }
    }`;
    const results = [];

    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.all.keys("name", "article");
        expect(b["article"]).to.be.deep.oneOf([
          createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
          createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
        ]);
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(2);
        done();
      }
    );
  });

  it("should evaluates VALUES clauses mixed with Property Paths", (t, done) => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX esws: <https://dblp.org/rec/conf/esws/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    SELECT ?author ?article WHERE {
      ?author owl:sameAs/dblp-rdf:authorOf ?article .
      VALUES ?article { esws:MinierSMV18a esws:MinierMSM17 }
    }`;
    const results = [];

    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.all.keys("author", "article");
        expect(b["author"]).to.deep.equal(
          createIRI("https://dblp.uni-trier.de/pers/m/Minier:Thomas")
        );
        expect(b["article"]).to.be.deep.oneOf([
          createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
          createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
        ]);
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

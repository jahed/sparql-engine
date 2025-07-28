// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { BindingBase, Bindings } from "../../src/index.ts";
import type { BindingsRecord } from "../../src/rdf/bindings.ts";
import { createIRI } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL MINUS", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate SPARQL queries with MINUS clauses", (t, done) => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s ?p ?o .
      MINUS { ?s rdf:type dblp-rdf:Person . }
    }`;
    let nbResults = 0;
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("s", "p", "o");
        expect(b["s"]).to.be.deep.oneOf([
          createIRI("https://dblp.uni-trier.de/pers/m/Minier:Thomas"),
          createIRI("https://dblp.org/pers/m/Minier:Thomas.nt"),
        ]);
        nbResults++;
      },
      done,
      () => {
        expect(nbResults).to.equal(6);
        done();
      }
    );
  });

  it("should evaluate SPARQL queries with MINUS clauses that found nothing", (t, done) => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      MINUS { ?s dblp-rdf:primaryFullPersonName ?name }
    }`;
    const results: BindingsRecord[] = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (b) => {
        assert.ok(b instanceof BindingBase);
        results.push(b.toObject());
      },
      done,
      () => {
        expect(results).to.deep.equal([]);
        done();
      }
    );
  });
});

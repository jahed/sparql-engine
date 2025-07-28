// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import type { QueryOutput } from "../../src/engine/plan-builder.ts";
import { Bindings } from "../../src/index.ts";
import { createIRI, createLiteral } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: alternative paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate alternative path of length 2", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:mbox|foaf:phone ?o .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b).to.have.property("o");
        switch (b["s"].value) {
          case "http://example.org/Alice":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("mailto:alice@example"),
              createIRI("tel:0604651478"),
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.deep.oneOf([createIRI("mailto:bob@example")]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.deep.oneOf([createIRI("tel:0645123549")]);
            break;
        }
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(4);
        done();
      }
    );
  });

  it("should evaluate alternative path with a subject", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            :Alice foaf:mbox|foaf:phone ?o .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.not.have.property("s");
        expect(b).to.have.property("o");
        expect(b["o"]).to.be.deep.oneOf([
          createIRI("mailto:alice@example"),
          createIRI("tel:0604651478"),
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

  it("should evaluate alternative path with an object", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:mbox|foaf:phone <tel:0645123549> .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b).to.not.have.property("o");
        expect(b["s"]).to.deep.equal(createIRI("http://example.org/Carol"));
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        done();
      }
    );
  });

  it("should evaluate alternative path of length 3", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:mbox|foaf:phone|foaf:skypeID ?o .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b).to.have.property("o");
        switch (b["s"].value) {
          case "http://example.org/Alice":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("mailto:alice@example"),
              createIRI("tel:0604651478"),
              createLiteral("skypeAlice"),
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("mailto:bob@example"),
              createLiteral("skypeBob"),
            ]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.deep.oneOf([createIRI("tel:0645123549")]);
            break;
        }
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(6);
        done();
      }
    );
  });

  it("should evaluate property paths with bound variables within a group", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>

        ASK WHERE {
          BIND(:Alice as ?foo).
          BIND(:Bob as ?bar).

          {
            ?foo foaf:knows | :hate ?bar.
          }
        }`;

    const results: boolean[] = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (b) => {
        assert.ok(typeof b === "boolean");
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        expect(results[0]).to.equal(true);
        done();
      }
    );
  });

  it("should evaluate alternative of sequence paths", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:knows/:love)|(foaf:knows/:hate) ?o .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b).to.have.property("o");
        switch (b["s"].value) {
          case "http://example.org/Alice":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Carol"),
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Didier"),
            ]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Carol"),
            ]);
            break;
          case "http://example.org/Mallory":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Bob"),
            ]);
            break;
        }
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(4);
        done();
      }
    );
  });

  it("should evaluate property paths with bound values both sides with the simplest query", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>

        ASK WHERE {
          {
            :Alice foaf:knows | :hate :Bob.
          }
        }`;

    const results: QueryOutput[] = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (b) => {
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        expect(results[0]).to.equal(true);
        done();
      }
    );
  });
});

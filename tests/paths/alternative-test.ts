/* file : sequence-test.js
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/api.ts";
import type { QueryOutput } from "../../src/engine/plan-builder.ts";
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
            expect(b["o"]).to.be.oneOf([
              "mailto:alice@example",
              "tel:0604651478",
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.oneOf(["mailto:bob@example"]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.oneOf(["tel:0645123549"]);
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
        expect(b["o"]).to.be.oneOf(["mailto:alice@example", "tel:0604651478"]);
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
        expect(b["s"]).to.equal("http://example.org/Carol");
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
            expect(b["o"]).to.be.oneOf([
              "mailto:alice@example",
              "tel:0604651478",
              '"skypeAlice"',
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.oneOf(["mailto:bob@example", '"skypeBob"']);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.oneOf(["tel:0645123549"]);
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
            expect(b["o"]).to.be.oneOf(["http://example.org/Carol"]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.oneOf(["http://example.org/Didier"]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.oneOf(["http://example.org/Carol"]);
            break;
          case "http://example.org/Mallory":
            expect(b["o"]).to.be.oneOf(["http://example.org/Bob"]);
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

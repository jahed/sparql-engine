/*
MIT License

Copyright (c) 2025 The SPARQL Engine Authors.

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

import { assert, expect } from "chai";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { createIRI } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: inverse paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate very simple reverse path", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            <mailto:alice@example> ^foaf:mbox ?s .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b["s"]).to.deep.equal(createIRI("http://example.org/Alice"));
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        done();
      }
    );
  });

  it("should evaluate simple reverse path", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?x foaf:knows/^foaf:knows ?y .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("x");
        expect(b).to.have.property("y");
        switch (b["x"].value) {
          case "http://example.org/Alice":
            expect(b["y"]).to.be.deep.oneOf([
              createIRI("http://example.org/Carol"),
              createIRI("http://example.org/Alice"),
            ]);
            break;
          case "http://example.org/Carol":
            expect(b["y"]).to.be.deep.oneOf([
              createIRI("http://example.org/Alice"),
              createIRI("http://example.org/Carol"),
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["y"]).to.be.deep.oneOf([
              createIRI("http://example.org/Bob"),
            ]);
            break;
          case "http://example.org/Mallory":
            expect(b["y"]).to.be.deep.oneOf([
              createIRI("http://example.org/Mallory"),
            ]);
            break;
          default:
            assert.fail();
        }
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(10);
        done();
      }
    );
  });

  it("should evaluate reverse sequence path", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s ^(foaf:knows/foaf:phone) ?o .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b).to.have.property("o");
        expect(b["s"]).to.be.deep.oneOf([createIRI("tel:0645123549")]);
        expect(b["o"]).to.be.deep.oneOf([createIRI("http://example.org/Bob")]);
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(1);
        done();
      }
    );
  });

  it("should evaluate nested reverse path", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s ^(^foaf:knows/(:love|:hate)) ?o .
        }`;
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.property("s");
        expect(b).to.have.property("o");
        expect(b["s"]).to.be.deep.oneOf([
          createIRI("http://example.org/Didier"),
          createIRI("http://example.org/Carol"),
        ]);
        expect(b["o"]).to.be.deep.oneOf([
          createIRI("http://example.org/Bob"),
          createIRI("http://example.org/Didier"),
          createIRI("http://example.org/Carol"),
        ]);
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(5);
        done();
      }
    );
  });
});

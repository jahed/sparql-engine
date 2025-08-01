// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { createIRI } from "../../src/utils/rdf.ts";

describe("SPARQL property paths: sequence paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate sequence path of length 2", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:knows/rdf:type ?o.
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b["s"]).to.be.deep.oneOf([
        createIRI("http://example.org/Alice"),
        createIRI("http://example.org/Bob"),
        createIRI("http://example.org/Carol"),
      ]);
      expect(b["o"]).to.be.deep.oneOf([
        createIRI("http://example.org/Man"),
        createIRI("http://example.org/Woman"),
      ]);
      results.push(b);
    }
    expect(results.length).to.equal(3);
  });

  it("should evaluate sequence path of length 3", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:knows/foaf:knows/rdf:type :Woman.
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b["s"]).to.be.deep.oneOf([
        createIRI("http://example.org/Alice"),
        createIRI("http://example.org/Carol"),
      ]);
      results.push(b);
    }
    expect(results.length).to.equal(2);
  });

  it("should evaluate sequence of alternative paths", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:love|:hate)/(foaf:mbox|foaf:phone) ?o.
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("o");
      switch (b["s"].value) {
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([createIRI("tel:0645123549")]);
          break;
        case "http://example.org/Eve":
          expect(b["o"]).to.be.deep.oneOf([createIRI("mailto:bob@example")]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(2);
  });
});

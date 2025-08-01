// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { createIRI, createLiteral } from "../../src/utils/rdf.ts";

describe("SPARQL property paths: Zero or One paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate simple Zero or One path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:skypeID? ?o .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("o");
      switch (b["s"].value) {
        case "http://example.org/Alice":
          expect(b["o"]).to.deep.be.oneOf([
            createIRI("http://example.org/Alice"),
            createLiteral("skypeAlice"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.deep.be.oneOf([
            createIRI("http://example.org/Bob"),
            createLiteral("skypeBob"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(21);
  });

  it("should evaluate Zero or One sequence path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:love/foaf:name)? ?o .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("o");
      switch (b["s"].value) {
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Bob"),
            createLiteral("Carol"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(20);
  });

  it("should evaluate nested Zero or One path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:love/foaf:name?)? ?o .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("o");
      switch (b["s"].value) {
        case "http://example.org/Alice":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Alice"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Bob"),
            createIRI("http://example.org/Carol"),
            createLiteral("Carol"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Carol"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(23);
  });

  it("should evaluate Zero or One alternative path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:mbox|foaf:phone)? ?o .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("o");
      switch (b["s"].value) {
        case "http://example.org/Alice":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Alice"),
            createIRI("mailto:alice@example"),
            createIRI("tel:0604651478"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Bob"),
            createIRI("mailto:bob@example"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Carol"),
            createIRI("tel:0645123549"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(23);
  });

  it("should evaluate Zero or One negated path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:name|foaf:phone|foaf:skypeID|foaf:mbox|rdf:type|rdfs:subClassOf|foaf:knows)? ?o .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("o");
      switch (b["s"].value) {
        case "http://example.org/Alice":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Alice"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Bob"),
            createIRI("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Carol"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["o"]).to.be.deep.oneOf([
            createIRI("http://example.org/Eve"),
            createIRI("http://example.org/Bob"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(23);
  });
});

// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { createIRI } from "../../src/utils/rdf.ts";

describe("SPARQL property paths: Zero or More paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate simple Zero or More path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s rdfs:subClassOf* ?type .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("type");
      switch (b["s"].value) {
        case "http://example.org/Woman":
          expect(b["type"]).to.be.deep.oneOf([
            createIRI("http://example.org/Woman"),
            createIRI("http://example.org/Person"),
            createIRI("http://example.org/Human"),
          ]);
          break;
        case "http://example.org/Man":
          expect(b["type"]).to.be.deep.oneOf([
            createIRI("http://example.org/Man"),
            createIRI("http://example.org/Person"),
            createIRI("http://example.org/Human"),
          ]);
          break;
        case "http://example.org/Person":
          expect(b["type"]).to.be.deep.oneOf([
            createIRI("http://example.org/Person"),
            createIRI("http://example.org/Human"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(24);
  });

  it("should evaluate Zero or More sequence path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:knows/:love)* ?name .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("name");
      switch (b["s"].value) {
        case "http://example.org/Alice":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Alice"),
            createIRI("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Didier"),
            createIRI("http://example.org/Bob"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Carol"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(22);
  });

  it("should evaluate Zero or More alternative path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:hate|:love)* ?name .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.have.property("name");
      switch (b["s"].value) {
        case "http://example.org/Alice":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Alice"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Bob"),
            createIRI("http://example.org/Carol"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Carol"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["name"]).to.be.deep.oneOf([
            createIRI("http://example.org/Eve"),
            createIRI("http://example.org/Bob"),
            createIRI("http://example.org/Carol"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(26);
  });

  it("should evaluate Zero or More negated path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:name|foaf:phone|foaf:skypeID|foaf:mbox|rdf:type|rdfs:subClassOf|foaf:knows)* ?o .
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
            createIRI("http://example.org/Didier"),
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
            createIRI("http://example.org/Carol"),
            createIRI("http://example.org/Didier"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(26);
  });
});

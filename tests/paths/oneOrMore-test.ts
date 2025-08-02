// SPDX-License-Identifier: MIT
import { assert, expect } from "chai";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/rdf/bindings.ts";
import { RDF } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: One or More paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate simple One or More path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:knows+ ?name .
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
            RDF.namedNode("http://example.org/Bob"),
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Mallory":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Eve"),
          ]);
          break;
        default:
          assert.fail();
      }
      results.push(b);
    }
    expect(results.length).to.equal(12);
  });

  it("should evaluate One or More sequence path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:knows/:love)+ ?name .
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
            RDF.namedNode("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Carol"),
          ]);
          break;
        default:
          assert.fail();
      }
      results.push(b);
    }
    expect(results.length).to.equal(3);
  });

  it("should evaluate One or More alternative path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (:hate|:love)+ ?name .
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
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(7);
  });

  it("should evaluate nested One or More path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:knows/:love+) ?name .
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
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["name"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        default:
          assert.fail();
      }
      results.push(b);
    }
    expect(results.length).to.equal(5);
  });

  it("should evaluate One or More negated path", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/TR/rdf-schema/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:name|foaf:phone|foaf:skypeID|foaf:mbox|rdf:type|rdfs:subClassOf|foaf:knows)+ ?o .
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
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
            RDF.namedNode("http://example.org/Carol"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(7);
  });
});

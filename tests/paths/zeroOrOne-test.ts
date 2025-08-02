// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/rdf/bindings.ts";
import { dataFactory } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: Zero or One paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/paths.ttl");
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
            dataFactory.namedNode("http://example.org/Alice"),
            dataFactory.literal("skypeAlice"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.deep.be.oneOf([
            dataFactory.namedNode("http://example.org/Bob"),
            dataFactory.literal("skypeBob"),
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
            dataFactory.namedNode("http://example.org/Bob"),
            dataFactory.literal("Carol"),
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
            dataFactory.namedNode("http://example.org/Alice"),
            dataFactory.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Bob"),
            dataFactory.namedNode("http://example.org/Carol"),
            dataFactory.literal("Carol"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Carol"),
            dataFactory.namedNode("http://example.org/Didier"),
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
            dataFactory.namedNode("http://example.org/Alice"),
            dataFactory.namedNode("mailto:alice@example"),
            dataFactory.namedNode("tel:0604651478"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Bob"),
            dataFactory.namedNode("mailto:bob@example"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Carol"),
            dataFactory.namedNode("tel:0645123549"),
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
            dataFactory.namedNode("http://example.org/Alice"),
            dataFactory.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Bob"),
            dataFactory.namedNode("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Carol"),
            dataFactory.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["o"]).to.be.deep.oneOf([
            dataFactory.namedNode("http://example.org/Eve"),
            dataFactory.namedNode("http://example.org/Bob"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(23);
  });
});

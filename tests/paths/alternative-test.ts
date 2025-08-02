// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import type { QueryOutput } from "../../src/engine/plan-builder.ts";
import { Bindings } from "../../src/rdf/bindings.ts";
import { RDF } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: alternative paths", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/paths.ttl");
    engine = new TestEngine(g);
  });

  it("should evaluate alternative path of length 2", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:mbox|foaf:phone ?o .
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
            RDF.namedNode("mailto:alice@example"),
            RDF.namedNode("tel:0604651478"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("mailto:bob@example"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([RDF.namedNode("tel:0645123549")]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(4);
  });

  it("should evaluate alternative path with a subject", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            :Alice foaf:mbox|foaf:phone ?o .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.not.have.property("s");
      expect(b).to.have.property("o");
      expect(b["o"]).to.be.deep.oneOf([
        RDF.namedNode("mailto:alice@example"),
        RDF.namedNode("tel:0604651478"),
      ]);
      results.push(b);
    }
    expect(results.length).to.equal(2);
  });

  it("should evaluate alternative path with an object", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:mbox|foaf:phone <tel:0645123549> .
        }`;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.property("s");
      expect(b).to.not.have.property("o");
      expect(b["s"]).to.deep.equal(RDF.namedNode("http://example.org/Carol"));
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should evaluate alternative path of length 3", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s foaf:mbox|foaf:phone|foaf:skypeID ?o .
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
            RDF.namedNode("mailto:alice@example"),
            RDF.namedNode("tel:0604651478"),
            RDF.literal("skypeAlice"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("mailto:bob@example"),
            RDF.literal("skypeBob"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([RDF.namedNode("tel:0645123549")]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(6);
  });

  it("should evaluate property paths with bound variables within a group", async () => {
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
    for await (const b of engine.execute(query)) {
      assert.ok(typeof b === "boolean");
      results.push(b);
    }
    expect(results.length).to.equal(1);
    expect(results[0]).to.equal(true);
  });

  it("should evaluate alternative of sequence paths", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s (foaf:knows/:love)|(foaf:knows/:hate) ?o .
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
            RDF.namedNode("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Mallory":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(4);
  });

  it("should evaluate property paths with bound values both sides with the simplest query", async () => {
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
    for await (const b of engine.execute(query)) {
      results.push(b);
    }
    expect(results.length).to.equal(1);
    expect(results[0]).to.equal(true);
  });
});

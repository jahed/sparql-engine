// SPDX-License-Identifier: MIT
import { Bindings } from "@jahed/sparql-engine/rdf/bindings.ts";
import { RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { assert, expect } from "chai";
import { before, describe, it } from "node:test";
import { createGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: Negated property sets", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/paths.ttl");
    engine = new TestEngine(g);
  });

  const data = [
    {
      name: "Zero or One path",
      query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows?) ?o .
                }`,
    },
    {
      name: "Zero or More path",
      query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows*) ?o .
                }`,
    },
    {
      name: "One or More path",
      query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows+) ?o .
                }`,
    },
    {
      name: "sequence path",
      query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(foaf:knows/foaf:name) ?o .
                }`,
    },
    {
      name: "negated path",
      query: `
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX : <http://example.org/>
                SELECT * WHERE {
                    ?s !(!foaf:knows|foaf:name) ?o .
                }`,
    },
  ];

  data.forEach((d) => {
    it(`should not evaluate negated "${d.name}" `, async () => {
      try {
        for await (const data of engine.execute(d.query)) {
        }
        assert.fail("Expected error.");
      } catch (error) {
        assert(error instanceof Error);
        expect(error.message).to.include("Parse error on line 6:");
      }
    });
  });

  it("should evaluate negated property set of length 1", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !foaf:knows ?o .
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
            RDF.namedNode("http://example.org/Woman"),
            RDF.literal("Alice"),
            RDF.namedNode("tel:0604651478"),
            RDF.literal("skypeAlice"),
            RDF.namedNode("http://example.org/Didier"),
            RDF.namedNode("mailto:alice@example"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Man"),
            RDF.literal("Bob"),
            RDF.literal("skypeBob"),
            RDF.namedNode("mailto:bob@example"),
            RDF.namedNode("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Woman"),
            RDF.literal("Carol"),
            RDF.namedNode("tel:0645123549"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Woman":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Person"),
          ]);
          break;
        case "http://example.org/Man":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Person"),
          ]);
          break;
        case "http://example.org/Person":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Human"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(19);
  });

  it("should evaluate negated property set of length 4", async () => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:mbox|foaf:knows|foaf:name|rdf:type) ?o .
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
            RDF.namedNode("tel:0604651478"),
            RDF.literal("skypeAlice"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Bob":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.literal("skypeBob"),
            RDF.namedNode("http://example.org/Carol"),
          ]);
          break;
        case "http://example.org/Carol":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("tel:0645123549"),
            RDF.namedNode("http://example.org/Didier"),
          ]);
          break;
        case "http://example.org/Woman":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Person"),
          ]);
          break;
        case "http://example.org/Man":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Person"),
          ]);
          break;
        case "http://example.org/Person":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Human"),
          ]);
          break;
        case "http://example.org/Eve":
          expect(b["o"]).to.be.deep.oneOf([
            RDF.namedNode("http://example.org/Bob"),
          ]);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(11);
  });
});

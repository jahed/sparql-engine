// SPDX-License-Identifier: MIT
import { assert, expect } from "chai";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { createIRI, createLiteral } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL property paths: Negated property sets", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/paths.ttl");
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
    it(`should not evaluate negated "${d.name}" `, () => {
      expect(() => engine.execute(d.query)).to.throw();
    });
  });

  it("should evaluate negated property set of length 1", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !foaf:knows ?o .
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
              createIRI("http://example.org/Woman"),
              createLiteral("Alice"),
              createIRI("tel:0604651478"),
              createLiteral("skypeAlice"),
              createIRI("http://example.org/Didier"),
              createIRI("mailto:alice@example"),
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Man"),
              createLiteral("Bob"),
              createLiteral("skypeBob"),
              createIRI("mailto:bob@example"),
              createIRI("http://example.org/Carol"),
            ]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Woman"),
              createLiteral("Carol"),
              createIRI("tel:0645123549"),
              createIRI("http://example.org/Didier"),
            ]);
            break;
          case "http://example.org/Woman":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Person"),
            ]);
            break;
          case "http://example.org/Man":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Person"),
            ]);
            break;
          case "http://example.org/Person":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Human"),
            ]);
            break;
          case "http://example.org/Eve":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Bob"),
            ]);
            break;
        }
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(19);
        done();
      }
    );
  });

  it("should evaluate negated property set of length 4", (t, done) => {
    const query = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX : <http://example.org/>
        SELECT * WHERE {
            ?s !(foaf:mbox|foaf:knows|foaf:name|rdf:type) ?o .
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
              createIRI("tel:0604651478"),
              createLiteral("skypeAlice"),
              createIRI("http://example.org/Didier"),
            ]);
            break;
          case "http://example.org/Bob":
            expect(b["o"]).to.be.deep.oneOf([
              createLiteral("skypeBob"),
              createIRI("http://example.org/Carol"),
            ]);
            break;
          case "http://example.org/Carol":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("tel:0645123549"),
              createIRI("http://example.org/Didier"),
            ]);
            break;
          case "http://example.org/Woman":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Person"),
            ]);
            break;
          case "http://example.org/Man":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Person"),
            ]);
            break;
          case "http://example.org/Person":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Human"),
            ]);
            break;
          case "http://example.org/Eve":
            expect(b["o"]).to.be.deep.oneOf([
              createIRI("http://example.org/Bob"),
            ]);
            break;
        }
        results.push(b);
      },
      done,
      () => {
        expect(results.length).to.equal(11);
        done();
      }
    );
  });
});

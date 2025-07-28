// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { stringToTerm, termToString } from "rdf-string";
import { createIRI, createLiteral } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

const GRAPH_IRI = createIRI("htpp://example.org#some-graph");

describe("SPARQL UPDATE: INSERT DATA queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph(null);
    const gB = getGraph(null);
    engine = new TestEngine(gA);
    engine.addNamedGraph(GRAPH_IRI, gB);
  });

  it("should evaluate INSERT DATA queries without a named Graph", (t, done) => {
    const query = `
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT DATA { <http://example/book1>  dc:title  "Fundamentals of Compiler Design" }`;

    engine.execute(query).subscribe(undefined, done, () => {
      const triples = engine._graph._store.getTriples(
        "http://example/book1",
        null,
        null
      );
      expect(triples.length).to.equal(1);
      expect(stringToTerm(triples[0].subject)).to.deep.equal(
        createIRI("http://example/book1")
      );
      expect(stringToTerm(triples[0].predicate)).to.deep.equal(
        createIRI("http://purl.org/dc/elements/1.1/title")
      );
      expect(stringToTerm(triples[0].object)).to.deep.equal(
        createLiteral("Fundamentals of Compiler Design")
      );
      done();
    });
  });

  it("should evaluate INSERT DATA queries using a named Graph", (t, done) => {
    const query = `
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT DATA {
      GRAPH <${termToString(GRAPH_IRI)}> {
        <http://example/book1>  dc:title  "Fundamentals of Compiler Design"
      }
    }`;

    engine.execute(query).subscribe(undefined, done, () => {
      const triples = engine
        .getNamedGraph(GRAPH_IRI)
        ._store.getTriples("http://example/book1", null, null);
      expect(triples.length).to.equal(1);
      expect(stringToTerm(triples[0].subject)).to.deep.equal(
        createIRI("http://example/book1")
      );
      expect(stringToTerm(triples[0].predicate)).to.deep.equal(
        createIRI("http://purl.org/dc/elements/1.1/title")
      );
      expect(stringToTerm(triples[0].object)).to.deep.equal(
        createLiteral("Fundamentals of Compiler Design")
      );
      done();
    });
  });
});

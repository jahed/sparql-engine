// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { stringToTerm, termToString } from "rdf-string";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine, type TestGraph } from "../utils.ts";

const GRAPH_IRI = RDF.namedNode("htpp://example.org#some-graph");

describe("SPARQL UPDATE: INSERT DATA queries", () => {
  let engine: TestEngine;
  let gA: TestGraph;
  beforeEach(() => {
    gA = createGraph();
    const gB = createGraph(undefined, undefined, GRAPH_IRI);
    engine = new TestEngine(gA);
    engine.addNamedGraph(gB);
  });

  it("should evaluate INSERT DATA queries without a named Graph", async () => {
    const query = `
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT DATA { <http://example/book1>  dc:title  "Fundamentals of Compiler Design" }`;

    for await (const b of engine.execute(query)) {
    }
    const triples = gA._store.getTriples("http://example/book1", null, null);
    expect(triples.length).to.equal(1);
    expect(stringToTerm(triples[0].subject)).to.deep.equal(
      RDF.namedNode("http://example/book1")
    );
    expect(stringToTerm(triples[0].predicate)).to.deep.equal(
      RDF.namedNode("http://purl.org/dc/elements/1.1/title")
    );
    expect(stringToTerm(triples[0].object)).to.deep.equal(
      RDF.literal("Fundamentals of Compiler Design")
    );
  });

  it("should evaluate INSERT DATA queries using a named Graph", async () => {
    const query = `
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT DATA {
      GRAPH <${termToString(GRAPH_IRI)}> {
        <http://example/book1>  dc:title  "Fundamentals of Compiler Design"
      }
    }`;

    for await (const b of engine.execute(query)) {
    }
    const triples = engine
      .getNamedGraph(GRAPH_IRI)
      ._store.getTriples("http://example/book1", null, null);
    expect(triples.length).to.equal(1);
    expect(stringToTerm(triples[0].subject)).to.deep.equal(
      RDF.namedNode("http://example/book1")
    );
    expect(stringToTerm(triples[0].predicate)).to.deep.equal(
      RDF.namedNode("http://purl.org/dc/elements/1.1/title")
    );
    expect(stringToTerm(triples[0].object)).to.deep.equal(
      RDF.literal("Fundamentals of Compiler Design")
    );
  });
});

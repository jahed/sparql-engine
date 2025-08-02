// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { BindingsRecord } from "../../src/rdf/bindings.ts";
import { Bindings } from "../../src/rdf/bindings.ts";
import { createInteger, dataFactory, UNBOUND } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL queries with OPTIONAL", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const g = getGraph("./tests/data/dblp_opt.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate OPTIONAL clauses that yield nothing", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article ?label WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
      OPTIONAL {
        ?article rdf:label ?label
      }
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("name", "article", "label");
      expect(b["label"]).to.deep.equal(UNBOUND);
      results.push(b);
    }
    expect(results.length).to.equal(5);
  });

  it("should evaluate OPTIONAL clauses that yield something", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?s ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      OPTIONAL {
        ?s dblp-rdf:authorOf ?article .
      }
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "article");
      expect(b["s"]).to.be.deep.oneOf([
        dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas"),
        dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas_2"),
      ]);
      if (
        b["s"].equals(
          dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas_2")
        )
      ) {
        expect(b["article"]).to.deep.equal(UNBOUND);
      } else {
        expect(b["article"]).to.not.deep.equal(UNBOUND);
      }
      results.push(b);
    }
    expect(results.length).to.equal(6);
  });

  it("should evaluate complex OPTIONAL clauses that yield nothing", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      OPTIONAL {
        ?s dblp-rdf:authorOf ?article .
        FILTER(?article = "Very nice WWW article")
      }
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("name", "article");
      expect(b["article"]).to.deep.equal(UNBOUND);
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should evaluate complex OPTIONAL clauses that yield something", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?s ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      OPTIONAL {
        ?s dblp-rdf:authorOf ?article .
        FILTER (?article != "Very nice WWW article")
      }
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "article");
      expect(b["s"]).to.be.deep.oneOf([
        dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas"),
        dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas_2"),
      ]);
      if (
        b["s"].equals(
          dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas_2")
        )
      ) {
        expect(b["article"]).to.deep.equal(UNBOUND);
      } else {
        expect(b["article"]).to.not.deep.equal(UNBOUND);
      }
      results.push(b);
    }
    expect(results.length).to.equal(6);
  });

  it("should not get an extra result when an OPTIONAL value exists", async () => {
    const graph = getGraph("./tests/data/SPARQL-Query-1.1-6.2.ttl");
    engine = new TestEngine(graph);
    const query = `
    # this is a modified example is from section 6.2 of the SPARQL Spec. It should only product 2 results
    PREFIX  dc:  <http://purl.org/dc/elements/1.1/>
    PREFIX  ns:  <http://example.org/ns#>
    SELECT  ?title ?price
    WHERE   { 
      ?x dc:title ?title .
      OPTIONAL { 
        ?x ns:price ?price .
      }
    }
    `;
    const results: BindingsRecord[] = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      results.push(bindings.toObject());
    }
    expect(results.length).to.equal(2);
    results.forEach((b) => {
      expect(b["title"]).to.be.deep.oneOf([
        dataFactory.literal("SPARQL Tutorial"),
        dataFactory.literal("The Semantic Web"),
      ]);
      expect(b["price"]).to.be.deep.oneOf([
        createInteger(42),
        createInteger(23),
      ]);
    });
  });

  it("should not get an extra result when an OPTIONAL value exists and multiple OPTIONAL clauses are used", async () => {
    const graph = getGraph("./tests/data/SPARQL-Query-1.1-6.2.ttl");
    engine = new TestEngine(graph);
    const query = `
    # this is a modified example is from section 6.2 of the SPARQL Spec. It should only produce 2 results
    PREFIX  dc:  <http://purl.org/dc/elements/1.1/>
    PREFIX  ns:  <http://example.org/ns#>
    SELECT  ?title ?price
    WHERE   { 
      OPTIONAL {
        ?x dc:title ?title .
      }
      OPTIONAL { 
        ?x ns:price ?price .
      }
    }
    `;
    const results: BindingsRecord[] = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      results.push(b);
    }
    expect(results.length).to.equal(2);
    results.map((b) => {
      expect(b["title"]).to.be.deep.oneOf([
        dataFactory.literal("SPARQL Tutorial"),
        dataFactory.literal("The Semantic Web"),
      ]);
      expect(b["price"]).to.be.deep.oneOf([
        createInteger(42),
        createInteger(23),
      ]);
    });
  });

  it("should get the correct number of results when an OPTIONAL results in an UNBOUND", async () => {
    const graph = getGraph("./tests/data/SPARQL-Query-1.1-6.2.ttl");
    engine = new TestEngine(graph);
    const query = `
    # this is a modified example is from section 6.2 of the SPARQL Spec. It should only produce 2 results
    PREFIX  dc:  <http://purl.org/dc/elements/1.1/>
    PREFIX  ns:  <http://example.org/ns#>
    SELECT  ?title ?price
    WHERE   { 
      ?x dc:title ?title .
      OPTIONAL { 
        ?x ns:price ?price . FILTER(?price > 30)
      }
    }
    `;
    const results: BindingsRecord[] = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      results.push(bindings.toObject());
    }
    expect(results.length).to.equal(2);
    results.map((b) => {
      expect(b["title"]).to.be.deep.oneOf([
        dataFactory.literal("SPARQL Tutorial"),
        dataFactory.literal("The Semantic Web"),
      ]);
      expect(b["price"]).to.be.deep.oneOf([createInteger(42), UNBOUND]);
    });
  });

  it("should get the correct number of results when an OPTIONAL results in an UNBOUND value with multiple OPTIONAL clauses", async () => {
    const graph = getGraph("./tests/data/SPARQL-Query-1.1-6.2.ttl");
    engine = new TestEngine(graph);
    const query = `
    # this is a modified example is from section 6.2 of the SPARQL Spec. It should only produce 2 results
    PREFIX  dc:  <http://purl.org/dc/elements/1.1/>
    PREFIX  ns:  <http://example.org/ns#>
    SELECT  ?title ?price
    WHERE   { 
      OPTIONAL {
        ?x dc:title ?title .
      }
      OPTIONAL { 
        ?x ns:price ?price . FILTER(?price > 30)
      }
    }
    `;
    const results: BindingsRecord[] = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      results.push(bindings.toObject());
    }
    expect(results.length).to.equal(2);
    results.map((b) => {
      expect(b["title"]).to.be.deep.oneOf([
        dataFactory.literal("SPARQL Tutorial"),
        dataFactory.literal("The Semantic Web"),
      ]);
      expect(b["price"]).to.be.deep.oneOf([createInteger(42), UNBOUND]);
    });
  });
});

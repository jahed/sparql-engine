// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { dataFactory } from "../../src/utils/rdf.ts";

describe("Semantic caching for SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("dblp.nt");
    engine = new TestEngine(g);
  });

  it("should fill the cache when evaluating a BGP", async () => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    }`;
    engine._builder.useCache();
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "p", "o");
      results.push(b);
    }
    // we have all results in double
    expect(results.length).to.equal(34);
    // check for cache hits
    const bgp = {
      patterns: [
        dataFactory.quad(
          dataFactory.variable("s"),
          dataFactory.variable("p"),
          dataFactory.variable("o")
        ),
      ],
      graphIRI: engine.defaultGraphIRI(),
    };
    const cache = engine._builder._currentCache!;
    expect(cache.count()).to.equal(1);
    expect(cache.has(bgp)).to.equal(true);
    // check that the cache is accessible
    const content = await cache.get(bgp)!;
    expect(content.length).to.equals(17);
  });

  it("should not cache BGPs when the query has a LIMIT modifier", async () => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    } LIMIT 10`;
    engine._builder.useCache();
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "p", "o");
      results.push(b);
    }
    // we have all results
    expect(results.length).to.equal(10);
    // assert that the cache is empty for this BGP
    const bgp = {
      patterns: [
        dataFactory.quad(
          dataFactory.variable("s"),
          dataFactory.variable("p"),
          dataFactory.variable("o")
        ),
      ],
      graphIRI: engine.defaultGraphIRI(),
    };
    const cache = engine._builder._currentCache!;
    expect(cache.count()).to.equal(0);
    expect(cache.has(bgp)).to.equal(false);
    expect(cache.get(bgp)).to.be.null;
  });

  it("should not cache BGPs when the query has an OFFSET modifier", async () => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    } OFFSET 10`;
    engine._builder.useCache();
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "p", "o");
      results.push(b);
    }
    // we have all results in double - 10 (due to then offfset)
    expect(results.length).to.equal(24);
    // assert that the cache is empty for this BGP
    const bgp = {
      patterns: [
        dataFactory.quad(
          dataFactory.variable("s"),
          dataFactory.variable("p"),
          dataFactory.variable("o")
        ),
      ],
      graphIRI: engine.defaultGraphIRI(),
    };
    const cache = engine._builder._currentCache!;
    expect(cache.count()).to.equal(0);
    expect(cache.has(bgp)).to.equal(false);
    expect(cache.get(bgp)).to.be.null;
  });
});

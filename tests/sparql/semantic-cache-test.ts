// SPDX-License-Identifier: MIT
import { LRUBGPCache } from "@jahed/sparql-engine/engine/cache/bgp-cache.ts";
import { Bindings } from "@jahed/sparql-engine/rdf/bindings.ts";
import {
  RDF,
  VARIABLE_o,
  VARIABLE_p,
  VARIABLE_s,
} from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { createGraph, TestEngine } from "../utils.ts";

describe("Semantic caching for SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should fill the cache when evaluating a BGP", async () => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    }`;
    await engine._builder.useCache(new LRUBGPCache(500, 1200 * 60 * 60));
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
      patterns: [RDF.quad(VARIABLE_s, VARIABLE_p, VARIABLE_o)],
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
    await engine._builder.useCache(new LRUBGPCache(500, 1200 * 60 * 60));
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
      patterns: [RDF.quad(VARIABLE_s, VARIABLE_p, VARIABLE_o)],
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
    await engine._builder.useCache(new LRUBGPCache(500, 1200 * 60 * 60));
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
      patterns: [RDF.quad(VARIABLE_s, VARIABLE_p, VARIABLE_o)],
      graphIRI: engine.defaultGraphIRI(),
    };
    const cache = engine._builder._currentCache!;
    expect(cache.count()).to.equal(0);
    expect(cache.has(bgp)).to.equal(false);
    expect(cache.get(bgp)).to.be.null;
  });
});

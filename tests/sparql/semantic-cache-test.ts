// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/index.ts";
import { dataFactory } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("Semantic caching for SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should fill the cache when evaluating a BGP", (t, done) => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    }`;
    engine._builder.useCache();
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("s", "p", "o");
        results.push(b);
      },
      done,
      () => {
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
        cache
          .get(bgp)!
          .then((content) => {
            expect(content.length).to.equals(17);
            done();
          })
          .catch(done);
      }
    );
  });

  it("should not cache BGPs when the query has a LIMIT modifier", (t, done) => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    } LIMIT 10`;
    engine._builder.useCache();
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("s", "p", "o");
        results.push(b);
      },
      done,
      () => {
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
        done();
      }
    );
  });

  it("should not cache BGPs when the query has an OFFSET modifier", (t, done) => {
    const query = `
    SELECT ?s ?p ?o WHERE {
      { ?s ?p ?o } UNION { ?s ?p ?o }
    } OFFSET 10`;
    engine._builder.useCache();
    const results = [];
    const iterator = engine.execute(query);
    iterator.subscribe(
      (bindings) => {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys("s", "p", "o");
        results.push(b);
      },
      done,
      () => {
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
        done();
      }
    );
  });
});

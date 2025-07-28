// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { LRUBGPCache } from "../../src/engine/cache/bgp-cache.ts";
import { BindingBase } from "../../src/index.ts";
import type { EngineTriple } from "../../src/types.ts";
import { createIRI, dataFactory } from "../../src/utils/rdf.ts";

/**
 * Format a BGP to the format expected by a BGPCache: an object
 * with fields 'patterns' and 'graphIRI'
 * @param {*} patterns - Set of triple patterns
 * @param {*} graphIRI - Graph's IRI
 */
function formatBGP(patterns: EngineTriple[], graphIRI: string) {
  return { patterns, graphIRI: createIRI(graphIRI) };
}

describe("LRUBGPCache", () => {
  let cache: LRUBGPCache;
  beforeEach(() => {
    cache = new LRUBGPCache(10000, 10000);
  });

  describe("#update/commit", () => {
    it("should supports insertion of items over time", (t, done) => {
      const writerID = "1";
      const patterns = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const bindings = [
        BindingBase.fromObject({
          s: createIRI(":s1"),
          type: createIRI(":c1"),
        }),
        BindingBase.fromObject({
          s: createIRI(":s2"),
          type: createIRI(":c2"),
        }),
      ];
      cache.update(bgp, bindings[0], writerID);
      cache.update(bgp, bindings[1], writerID);
      cache.commit(bgp, writerID);
      cache
        .get(bgp)!
        .then((content) => {
          expect(content.map((x) => x.toObject())).to.deep.equals(
            bindings.map((x) => x.toObject())
          );
          done();
        })
        .catch(done);
    });
  });

  describe("#findSubset", () => {
    it("should find a subset for a Basic Graph Pattern which is partially in the cache", () => {
      // populate cache
      const subsetPatterns = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
      ];
      const subsetBGP = formatBGP(subsetPatterns, "http://example.org#graphA");
      cache.update(
        subsetBGP,
        BindingBase.fromObject({ s: createIRI(":s1") }),
        "1"
      );
      cache.commit(subsetBGP, "1");
      // search for subset
      const patterns = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("foaf:name"),
          dataFactory.variable("name")
        ),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const [computedSubset, computedMissing] = cache.findSubset(bgp);
      expect(computedSubset).to.deep.equals(subsetPatterns);
      expect(computedMissing).to.deep.equals([patterns[1]]);
    });

    it("should find an empty subset for a Basic Graph Pattern with no valid subset in the cache", () => {
      // populate cache
      const subsetPatterns = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
      ];
      const subsetBGP = formatBGP(subsetPatterns, "http://example.org#graphA");
      cache.update(
        subsetBGP,
        BindingBase.fromObject({ s: createIRI(":s1") }),
        "1"
      );
      cache.commit(subsetBGP, "1");
      // search for subset
      const patterns = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("foaf:knows"),
          dataFactory.variable("type")
        ),
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("foaf:name"),
          dataFactory.variable("name")
        ),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const [computedSubset, computedMissing] = cache.findSubset(bgp);
      expect(computedSubset.length).to.equals(0);
      expect(computedMissing).to.deep.equals(patterns);
    });

    it("should find the largest subset from the cache entry", () => {
      // populate cache
      const subsetPatterns_a = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
      ];
      const subsetPatterns_b = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("foaf:name"),
          dataFactory.variable("name")
        ),
      ];
      const subsetBGP_a = formatBGP(
        subsetPatterns_a,
        "http://example.org#graphA"
      );
      const subsetBGP_b = formatBGP(
        subsetPatterns_b,
        "http://example.org#graphA"
      );
      cache.update(
        subsetBGP_a,
        BindingBase.fromObject({ s: createIRI(":s1") }),
        "1"
      );
      cache.commit(subsetBGP_a, "1");
      cache.update(
        subsetBGP_b,
        BindingBase.fromObject({ s: createIRI(":s2") }),
        "1"
      );
      cache.commit(subsetBGP_b, "1");
      // search for subset
      const patterns = [
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("rdf:type"),
          dataFactory.variable("type")
        ),
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("foaf:knows"),
          dataFactory.variable("type")
        ),
        dataFactory.quad(
          dataFactory.variable("s"),
          createIRI("foaf:name"),
          dataFactory.variable("name")
        ),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const [computedSubset, computedMissing] = cache.findSubset(bgp);
      expect(computedSubset).to.deep.equals(subsetPatterns_b);
      expect(computedMissing).to.deep.equals([patterns[1]]);
    });
  });
});

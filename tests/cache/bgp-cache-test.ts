// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { LRUBGPCache } from "../../src/engine/cache/bgp-cache.ts";
import { BindingBase } from "../../src/rdf/bindings.ts";
import type { EngineTriple } from "../../src/types.ts";
import { RDF, VARIABLE_s } from "../../src/utils/rdf.ts";

/**
 * Format a BGP to the format expected by a BGPCache: an object
 * with fields 'patterns' and 'graphIRI'
 * @param {*} patterns - Set of triple patterns
 * @param {*} graphIRI - Graph's IRI
 */
function formatBGP(patterns: EngineTriple[], graphIRI: string) {
  return { patterns, graphIRI: RDF.namedNode(graphIRI) };
}

describe("LRUBGPCache", () => {
  let cache: LRUBGPCache;
  beforeEach(() => {
    cache = new LRUBGPCache(10000, 10000);
  });

  describe("#update/commit", () => {
    it("should supports insertion of items over time", async () => {
      const writerID = "1";
      const patterns = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const bindings = [
        BindingBase.fromObject({
          s: RDF.namedNode(":s1"),
          type: RDF.namedNode(":c1"),
        }),
        BindingBase.fromObject({
          s: RDF.namedNode(":s2"),
          type: RDF.namedNode(":c2"),
        }),
      ];
      cache.update(bgp, bindings[0], writerID);
      cache.update(bgp, bindings[1], writerID);
      cache.commit(bgp, writerID);
      const content = await cache.get(bgp)!;
      expect(content.map((x) => x.toObject())).to.deep.equals(
        bindings.map((x) => x.toObject())
      );
    });
  });

  describe("#findSubset", () => {
    it("should find a subset for a Basic Graph Pattern which is partially in the cache", () => {
      // populate cache
      const subsetPatterns = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
      ];
      const subsetBGP = formatBGP(subsetPatterns, "http://example.org#graphA");
      cache.update(
        subsetBGP,
        BindingBase.fromObject({ s: RDF.namedNode(":s1") }),
        "1"
      );
      cache.commit(subsetBGP, "1");
      // search for subset
      const patterns = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
        RDF.quad(VARIABLE_s, RDF.namedNode("foaf:name"), RDF.variable("name")),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const [computedSubset, computedMissing] = cache.findSubset(bgp);
      expect(computedSubset).to.deep.equals(subsetPatterns);
      expect(computedMissing).to.deep.equals([patterns[1]]);
    });

    it("should find an empty subset for a Basic Graph Pattern with no valid subset in the cache", () => {
      // populate cache
      const subsetPatterns = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
      ];
      const subsetBGP = formatBGP(subsetPatterns, "http://example.org#graphA");
      cache.update(
        subsetBGP,
        BindingBase.fromObject({ s: RDF.namedNode(":s1") }),
        "1"
      );
      cache.commit(subsetBGP, "1");
      // search for subset
      const patterns = [
        RDF.quad(VARIABLE_s, RDF.namedNode("foaf:knows"), RDF.variable("type")),
        RDF.quad(VARIABLE_s, RDF.namedNode("foaf:name"), RDF.variable("name")),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const [computedSubset, computedMissing] = cache.findSubset(bgp);
      expect(computedSubset.length).to.equals(0);
      expect(computedMissing).to.deep.equals(patterns);
    });

    it("should find the largest subset from the cache entry", () => {
      // populate cache
      const subsetPatterns_a = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
      ];
      const subsetPatterns_b = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
        RDF.quad(VARIABLE_s, RDF.namedNode("foaf:name"), RDF.variable("name")),
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
        BindingBase.fromObject({ s: RDF.namedNode(":s1") }),
        "1"
      );
      cache.commit(subsetBGP_a, "1");
      cache.update(
        subsetBGP_b,
        BindingBase.fromObject({ s: RDF.namedNode(":s2") }),
        "1"
      );
      cache.commit(subsetBGP_b, "1");
      // search for subset
      const patterns = [
        RDF.quad(VARIABLE_s, RDF.namedNode("rdf:type"), RDF.variable("type")),
        RDF.quad(VARIABLE_s, RDF.namedNode("foaf:knows"), RDF.variable("type")),
        RDF.quad(VARIABLE_s, RDF.namedNode("foaf:name"), RDF.variable("name")),
      ];
      const bgp = formatBGP(patterns, "http://example.org#graphA");
      const [computedSubset, computedMissing] = cache.findSubset(bgp);
      expect(computedSubset).to.deep.equals(subsetPatterns_b);
      expect(computedMissing).to.deep.equals([patterns[1]]);
    });
  });
});

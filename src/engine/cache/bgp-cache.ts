// SPDX-License-Identifier: MIT
import { BinarySearchTree } from "@seald-io/binary-search-tree";
import { differenceWith, findIndex, maxBy } from "lodash-es";
import { termToString } from "rdf-string";
import { Bindings } from "../../rdf/bindings.ts";
import type { EngineTriple } from "../../types.ts";
import { termToValue, tripleEquals } from "../../utils/rdf.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import { Pipeline } from "../pipeline/pipeline.ts";
import { AsyncLRUCache } from "./cache-base.ts";
import type {
  AsyncCacheEntry,
  BasicGraphPattern,
  BGPCache,
  SavedBGP,
} from "./types.ts";

function hashTriple(triple: EngineTriple): string {
  return `s=${termToString(triple.subject)}&p=${termToString(triple.predicate)}&o=${termToString(triple.object)}`;
}

function hashBasicGraphPattern(bgp: BasicGraphPattern): string {
  return `${bgp.patterns.map(hashTriple).join(";")}&graph-iri=${termToValue(bgp.graphIRI)}`;
}

/**
 * An implementation of a {@link BGPCache} using an {@link AsyncLRUCache}
 */
export class LRUBGPCache implements BGPCache {
  // Main index: for each triple pattern, register the BGP where their occurs
  // Used to speed up the #findSubset method
  private readonly _allKeys: BinarySearchTree<string, SavedBGP>;
  // Secondary index: track the triple patterns of each BGP.
  // Used to clear the primary index when items slides out from the cache
  private readonly _patternsPerBGP: Map<string, BasicGraphPattern>;
  // AsyncCache used to store set of solution bindings
  private readonly _cache: AsyncLRUCache<string, Bindings, string>;

  constructor(maxSize: number, ttl: number) {
    this._patternsPerBGP = new Map();
    this._allKeys = new BinarySearchTree({
      checkValueEquality: (a: SavedBGP, b: SavedBGP) => a.key === b.key,
    });
    this._cache = new AsyncLRUCache({
      maxSize,
      ttl,
      sizeCalculation: (item: AsyncCacheEntry<Bindings, string>) => {
        return item.content.length;
      },
      dispose: (v, key: string) => {
        // remove index entries when they slide out
        if (this._patternsPerBGP.has(key)) {
          const bgp = this._patternsPerBGP.get(key)!;
          bgp.patterns.forEach((pattern) =>
            this._allKeys.delete(hashTriple(pattern), { bgp, key })
          );
          this._patternsPerBGP.delete(key);
        }
      },
    });
  }

  has(bgp: BasicGraphPattern): boolean {
    return this._cache.has(hashBasicGraphPattern(bgp));
  }

  update(bgp: BasicGraphPattern, item: Bindings, writerID: string): void {
    const key = hashBasicGraphPattern(bgp);
    if (!this._cache.has(key)) {
      // update the indexes
      this._patternsPerBGP.set(key, bgp);
      bgp.patterns.forEach((pattern) =>
        this._allKeys.insert(hashTriple(pattern), { bgp, key })
      );
    }
    this._cache.update(key, item, writerID);
  }

  get(bgp: BasicGraphPattern): Promise<Bindings[]> | null {
    return this._cache.get(hashBasicGraphPattern(bgp));
  }

  getAsPipeline(
    bgp: BasicGraphPattern,
    onCancel?: () => PipelineStage<Bindings>
  ): PipelineStage<Bindings> {
    const bindings = this.get(bgp);
    if (bindings === null) {
      return Pipeline.getInstance().empty();
    }
    let iterator = Pipeline.getInstance().from(bindings);
    return Pipeline.getInstance().mergeMap(iterator, (bindings) => {
      // if the results is empty AND the cache do not contains the BGP
      // it means that the entry has been deleted before its insertion completed
      if (bindings.length === 0 && !this.has(bgp)) {
        return onCancel === undefined
          ? Pipeline.getInstance().empty()
          : onCancel();
      }
      return Pipeline.getInstance().from(bindings.map((b) => b.clone()));
    });
  }

  commit(bgp: BasicGraphPattern, writerID: string): void {
    this._cache.commit(hashBasicGraphPattern(bgp), writerID);
  }

  delete(bgp: BasicGraphPattern, writerID: string): void {
    const key = hashBasicGraphPattern(bgp);
    this._cache.delete(key, writerID);
    // clear the indexes
    this._patternsPerBGP.delete(key);
    bgp.patterns.forEach((pattern) =>
      this._allKeys.delete(hashTriple(pattern), { bgp, key })
    );
  }

  count(): number {
    return this._cache.count();
  }

  findSubset(bgp: BasicGraphPattern): [EngineTriple[], EngineTriple[]] {
    // if the bgp is in the cache, then the computation is simple
    if (this.has(bgp)) {
      return [bgp.patterns, []];
    }
    // otherwise, we search for all candidate subsets
    let matches = [];
    for (let pattern of bgp.patterns) {
      const searchResults = this._allKeys
        .search(hashTriple(pattern))
        .filter((v) => {
          // remove all BGPs that are not a subset of the input BGP
          // we use lodash.findIndex + rdf.tripleEquals to check for triple pattern equality
          return v.bgp.patterns.every(
            (a) => findIndex(bgp.patterns, (b) => tripleEquals(a, b)) > -1
          );
        });
      matches.push({ pattern, searchResults });
    }
    // compute the largest subset BGP and the missing patterns (missingPatterns = input_BGP - subset_BGP)
    let foundPatterns: EngineTriple[] = [];
    let maxBGPLength = -1;
    for (let match of matches) {
      if (match.searchResults.length > 0) {
        const localMax = maxBy(
          match.searchResults,
          (v) => v.bgp.patterns.length
        );
        if (
          localMax !== undefined &&
          localMax.bgp.patterns.length > maxBGPLength
        ) {
          maxBGPLength = localMax.bgp.patterns.length;
          foundPatterns = localMax.bgp.patterns;
        }
      }
    }
    return [
      foundPatterns,
      differenceWith(bgp.patterns, foundPatterns, tripleEquals),
    ];
  }
}

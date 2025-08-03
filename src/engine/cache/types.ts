// SPDX-License-Identifier: MIT
import { Bindings } from "../../rdf/bindings.ts";
import type { EngineIRI, EngineTriple } from "../../types.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

export interface BasicGraphPattern {
  patterns: EngineTriple[];
  graphIRI: EngineIRI;
}

export interface SavedBGP {
  bgp: BasicGraphPattern;
  key: string;
}

/**
 * A cache is a vue that materializes data for latter re-use
 */
export interface Cache<K extends {}, T extends {}> {
  /**
   * Put an item into the cache
   * @param key - Item's key
   * @param item - Item
   */
  put(key: K, item: T): void;

  /**
   * Test if the cache contains an item with a given key
   * @param key - Item's key
   * @return True if the cache contains the item with the given key, False otherwise
   */
  has(key: K): boolean;

  /**
   * Access an item by its key.
   * Each call to get() should be predated by a call to has(),
   * to check if the item is in the cache.
   * @param key - Item's key
   * @return The item with the given key, or null if it was not found
   */
  get(key: K): T | null;

  /**
   * Remove an item from the cache
   * @param key - Item's key
   */
  delete(key: K): void;

  /**
   * Get the number of items currently in the cache
   * @return The number of items currently in the cache
   */
  count(): number;
}

/**
 * An async cache is cache which stores collections of items that are built over time.
 * Writers will call the update and commit method to update the cache content & mark items as available.
 */
export interface AsyncCache<K, T, I> {
  /**
   * Update an item into the cache
   * @param key - Item's key
   * @param item - Item
   * @param writerID - ID of the writer
   */
  update(key: K, item: T, writerID: I): void;

  /**
   * Mark an item as available from the cache
   * @param key - Item's key
   * @param IwriterID - ID of the writer
   */
  commit(key: K, writerID: I): void;

  /**
   * Test if the cache contains an item with a given key
   * @param key - Item's key
   * @return True if the cache contains the item with the given key, False otherwise
   */
  has(key: K): boolean;

  /**
   * Access an item by its key.
   * Each call to get() should be predated by a call to has() to check if the item is in the cache.
   * @param key - Item's key
   * @return The values of the item with the given key, or null if it was not found
   */
  get(key: K): Promise<T[]> | null;

  /**
   * Remove an item from the cache
   * @param key - Item's key
   */
  delete(key: K, writerID: I): void;

  /**
   * Get the number of items currently in the cache
   * @return The number of items currently in the cache
   */
  count(): number;
}

/**
 * Data-structure used for the base implementation of an asynchronous cache.
 */
export interface AsyncCacheEntry<T, I> {
  /** The cache entry's content */
  content: Array<T>;
  /** The ID of the writer that is allowed to edit the cache entry */
  writerID: I;
  /** All reads that wait for this cache entry to be committed */
  pendingReaders: Array<(items: Array<T>) => void>;
  /** Whether the cache entry is availbale for read or not */
  isComplete: boolean;
}

/**
 * An async cache that stores the solution bindings from BGP evaluation
 */
export interface BGPCache
  extends AsyncCache<BasicGraphPattern, Bindings, string> {
  /**
   * Search for a BGP in the cache that is a subset of the input BGP
   * This method enable the user to use the Semantic caching technique,
   * to evaluate a BGP using one of its cached subset.
   * @param bgp - Basic Graph pattern
   * @return A pair [subset BGP, set of patterns not in cache]
   */
  findSubset(bgp: BasicGraphPattern): [EngineTriple[], EngineTriple[]];

  /**
   * Access the cache and returns a pipeline stage that returns the content of the cache for a given BGP
   * @param bgp - Cache key, i.e., a Basic Graph pattern
   * @param onCancel - Callback invoked when the cache entry is deleted before being committed, so we can produce an alternative pipeline stage to continue query processing. Typically, it is the pipeline stage used to evaluate the BGP without the cache.
   * @return A pipeline stage that returns the content of the cache entry for the given BGP
   */
  getAsPipeline(
    bgp: BasicGraphPattern,
    onCancel?: () => PipelineStage<Bindings>
  ): PipelineStage<Bindings>;
}

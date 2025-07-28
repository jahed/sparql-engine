// SPDX-License-Identifier: MIT
import { LRUCache } from "lru-cache";
import type { AsyncCache, Cache } from "./cache-interfaces.ts";

/**
 * An in-memory LRU cache
 */
export class BaseLRUCache<K extends {}, T extends {}> implements Cache<K, T> {
  private readonly _content: LRUCache<K, T>;

  /**
   * Constructor
   * @param maxSize - The maximum size of the cache
   * @param maxAge - Maximum age in ms
   * @param length - Function that is used to calculate the length of stored items
   * @param onDispose - Function that is called on items when they are dropped from the cache
   */
  constructor(options: LRUCache.Options<K, T, unknown>) {
    // if we set a dispose function, we need to turn 'noDisposeOnSet' to True,
    // otherwise onDispose will be called each time an item is updated (instead of when it slide out),
    // which will break any class extending BaseAsyncCache
    if (options.dispose !== undefined) {
      options["noDisposeOnSet"] = true;
    }
    this._content = new LRUCache<K, T, unknown>(options);
  }

  put(key: K, item: T): void {
    this._content.set(key, item);
  }

  has(key: K): boolean {
    return this._content.has(key);
  }

  get(key: K): T | null {
    if (this._content.has(key)) {
      return this._content.get(key)!;
    }
    return null;
  }

  delete(key: K): void {
    this._content.delete(key);
  }

  count(): number {
    return this._content.size;
  }
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
 * A base class for implementing an asynchronous cache.
 * It simply needs to provides a data structure used to cache items
 */
export abstract class BaseAsyncCache<K extends {}, T extends {}, I>
  implements AsyncCache<K, T, I>
{
  private readonly _cache: Cache<K, AsyncCacheEntry<T, I>>;

  constructor(cache: Cache<K, AsyncCacheEntry<T, I>>) {
    this._cache = cache;
  }

  has(key: K): boolean {
    return this._cache.has(key);
  }

  update(key: K, item: T, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!;
      if (entry.writerID === writerID) {
        entry.content.push(item);
        this._cache.put(key, entry);
      }
    } else {
      this._cache.put(key, {
        content: [item],
        writerID,
        isComplete: false,
        pendingReaders: [],
      });
    }
  }

  commit(key: K, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!;
      if (entry.writerID === writerID) {
        // update cache entry ot marke it complete
        this._cache.put(key, {
          content: entry.content,
          writerID: entry.writerID,
          isComplete: true,
          pendingReaders: [],
        });
        // resolve all pending readers
        entry.pendingReaders.forEach((resolve) => resolve(entry.content));
      }
    }
  }

  get(key: K): Promise<T[]> | null {
    if (this.has(key)) {
      const entry = this._cache.get(key)!;
      if (entry.isComplete) {
        return Promise.resolve(entry.content);
      }
      // wait until the entry is complete
      // all awaiting promises will be resolved by the commit or delete method
      return new Promise((resolve) => {
        entry.pendingReaders.push(resolve);
      });
    }
    return null;
  }

  delete(key: K, writerID: I): void {
    if (this._cache.has(key)) {
      const entry = this._cache.get(key)!;
      if (entry.writerID === writerID) {
        this._cache.delete(key);
        // resolve all pending readers with an empty result
        entry.pendingReaders.forEach((resolve) => resolve([]));
      }
    }
  }

  count(): number {
    return this._cache.count();
  }
}

/**
 * An in-memory LRU implementation of an asynchronous cache.
 */
export class AsyncLRUCache<
  K extends {},
  T extends {},
  I,
> extends BaseAsyncCache<K, T, I> {
  constructor(options: LRUCache.Options<K, AsyncCacheEntry<T, I>, unknown>) {
    super(new BaseLRUCache<K, AsyncCacheEntry<T, I>>(options));
  }
}

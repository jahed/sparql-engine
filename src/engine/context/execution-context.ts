// SPDX-License-Identifier: MIT
"use strict";

import type { IriTerm } from "sparqljs";
import type { BGPCache } from "../cache/bgp-cache.ts";
import { QueryHints } from "./query-hints.ts";

/**
 * An execution context conatains control information for query execution.
 */
export default class ExecutionContext {
  protected _properties: Map<Symbol, any>;
  protected _hints: QueryHints;
  protected _defaultGraphs: IriTerm[];
  protected _namedGraphs: IriTerm[];
  protected _cache: BGPCache | null;

  constructor() {
    this._properties = new Map();
    this._hints = new QueryHints();
    this._defaultGraphs = [];
    this._namedGraphs = [];
    this._cache = null;
  }

  /**
   * The set of graphs used as the default graph
   * @return The set of graphs used as the default graph
   */
  get defaultGraphs() {
    return this._defaultGraphs;
  }

  /**
   * Update the set of graphs used as the default graph
   * @param  values - The set of graphs used as the default graph
   */
  set defaultGraphs(values: IriTerm[]) {
    this._defaultGraphs = values.slice(0);
  }

  /**
   * The set of graphs used as named graphs
   * @return The set of graphs used as named graphs
   */
  get namedGraphs() {
    return this._namedGraphs;
  }

  /**
   * Update the set of graphs used as named graphs
   * @param  values - The set of graphs used as named graphs
   */
  set namedGraphs(values: IriTerm[]) {
    this._namedGraphs = values.slice(0);
  }

  /**
   * Get query hints collected until now
   * @return All query hints collected until now
   */
  get hints() {
    return this._hints;
  }

  /**
   * Update the query hints
   * @param  newHints - New query hints
   */
  set hints(newHints: QueryHints) {
    this._hints = newHints;
  }

  /**
   * Get the BGP cache currently used by the query engine.
   * returns null if caching is disabled
   * @return The BGP cache currently used by the query engine, or null if caching is disabled.
   */
  get cache(): BGPCache | null {
    return this._cache;
  }

  /**
   * Set the BGP cache currently used by the query engine.
   * Use null to disable caching
   * @param newCache - The BGP cache to use for caching.
   */
  set cache(newCache: BGPCache | null) {
    this._cache = newCache;
  }

  /**
   * Test the caching is enabled
   * @return True if the caching is enabled, false otherwise
   */
  cachingEnabled(): boolean {
    return this._cache !== null;
  }

  /**
   * Get a property associated with a key
   * @param  key - Key associated with the property
   * @return  The value associated with the key
   */
  getProperty(key: Symbol): any | null {
    return this._properties.get(key);
  }

  /**
   * Test if the context contains a property associated with a key
   * @param  key - Key associated with the property
   * @return True if the context contains a property associated with the key
   */
  hasProperty(key: Symbol): boolean {
    return this._properties.has(key);
  }

  /**
   * Set a (key, value) property in the context
   * @param key - Key of the property
   * @param value - Value of the property
   */
  setProperty(key: Symbol, value: any): void {
    this._properties.set(key, value);
  }

  /**
   * Clone the execution context
   * @return A clone of the execution context
   */
  clone(): ExecutionContext {
    const res = new ExecutionContext();
    this._properties.forEach((value, key) => res.setProperty(key, value));
    res._hints = this.hints.clone();
    res._defaultGraphs = this._defaultGraphs.slice(0);
    res._namedGraphs = this._namedGraphs.slice(0);
    res._cache = this._cache;
    return res;
  }

  /**
   * Merge the context with another execution context
   * @param  other - Execution context to merge with
   * @return The merged execution context
   */
  merge(other: ExecutionContext): ExecutionContext {
    const res = this.clone();
    other._properties.forEach((value, key) => res.setProperty(key, value));
    res._hints = this._hints.merge(other._hints);
    res._defaultGraphs = this._defaultGraphs.concat(other._defaultGraphs);
    res._namedGraphs = this._namedGraphs.concat(other.namedGraphs);
    return res;
  }
}

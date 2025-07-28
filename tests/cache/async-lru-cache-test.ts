/*
MIT License

Copyright (c) 2025 The SPARQL Engine Authors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { AsyncLRUCache } from "../../src/engine/cache/cache-base.ts";

describe("AsyncLRUCache", () => {
  let cache: AsyncLRUCache<number, number | string, unknown>;
  beforeEach(() => {
    cache = new AsyncLRUCache({
      ttl: 10000,
      ttlAutopurge: true,
    });
  });

  describe("#update/commit", () => {
    it("should supports insertion of items over time", (t, done) => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      cache.update(1, 2, writerID);
      cache.update(1, 3, writerID);
      cache.commit(1, writerID);
      cache
        .get(1)!
        .then((content) => {
          expect(content).to.deep.equals([1, 2, 3]);
          done();
        })
        .catch(done);
    });

    it("should supports concurrent insertions of items from distinct writers", (t, done) => {
      const firstID = 1;
      const secondID = 2;
      cache.update(1, 1, firstID);
      cache.update(1, "1", secondID);
      cache.update(1, 2, firstID);
      cache.update(1, "2", secondID);
      cache.update(1, "3", secondID);
      cache.update(1, 3, firstID);
      cache.update(1, "4", secondID);
      cache.commit(1, secondID);
      cache.commit(1, firstID);
      cache
        .get(firstID)!
        .then((content) => {
          expect(content).to.deep.equals([1, 2, 3]);
          done();
        })
        .catch(done);
    });
  });

  describe("#has", () => {
    it("should returns true when the cache entry is available", () => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      cache.update(1, 2, writerID);
      cache.update(1, 3, writerID);
      cache.commit(1, writerID);
      expect(cache.has(1)).to.deep.equals(true);
    });

    it("should returns false when the cache entry is not available", () => {
      const writerID = 1;
      expect(cache.has(1)).to.deep.equals(false);
      cache.update(1, 1, writerID);
      cache.commit(1, writerID);
      expect(cache.has(1)).to.deep.equals(true);
    });
  });

  describe("#get", () => {
    it("should returns null when the key is not in the cache", () => {
      expect(cache.get(1)).to.deep.equals(null);
    });

    it("should delay execution until the cache entry is committed", (t, done) => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      cache
        .get(1)!
        .then((content) => {
          expect(content).to.deep.equals([1, 2]);
          done();
        })
        .catch(done);
      cache.update(1, 2, writerID);
      cache.commit(1, writerID);
    });
  });

  describe("#delete", () => {
    it("should delete items inserted into the cache", () => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      expect(cache.has(1)).to.deep.equals(true);
      cache.delete(1, writerID);
      expect(cache.has(1)).to.deep.equals(false);
    });

    it("should resolve get promises to an empty array when an uncommitted entry is deleted", (t, done) => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      cache
        .get(1)!
        .then((content) => {
          expect(content.length).to.deep.equals(0);
          done();
        })
        .catch(done);
      cache.delete(1, writerID);
    });
  });
});

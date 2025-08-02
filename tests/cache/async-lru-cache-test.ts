// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { AsyncLRUCache } from "@jahed/sparql-engine/engine/cache/cache-base.ts";

describe("AsyncLRUCache", () => {
  let cache: AsyncLRUCache<number, number | string, unknown>;
  beforeEach(() => {
    cache = new AsyncLRUCache({
      ttl: 10000,
      ttlAutopurge: true,
    });
  });

  describe("#update/commit", () => {
    it("should supports insertion of items over time", async () => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      cache.update(1, 2, writerID);
      cache.update(1, 3, writerID);
      cache.commit(1, writerID);
      const content = await cache.get(1)!;
      expect(content).to.deep.equals([1, 2, 3]);
    });

    it("should supports concurrent insertions of items from distinct writers", async () => {
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
      const content = await cache.get(firstID)!;
      expect(content).to.deep.equals([1, 2, 3]);
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

    it("should delay execution until the cache entry is committed", async () => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      const promise = cache.get(1)!;
      cache.update(1, 2, writerID);
      cache.commit(1, writerID);
      return promise.then((content) => {
        expect(content).to.deep.equals([1, 2]);
      });
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

    it("should resolve get promises to an empty array when an uncommitted entry is deleted", async () => {
      const writerID = 1;
      cache.update(1, 1, writerID);
      const promise = cache.get(1)!;
      cache.delete(1, writerID);
      return promise.then((content) => {
        expect(content.length).to.deep.equals(0);
      });
    });
  });
});

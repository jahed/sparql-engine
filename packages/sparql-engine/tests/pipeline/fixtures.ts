// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { describe, it } from "node:test";
import type { PipelineEngine } from "../../src/index.ts";

/**
 * Test an implementation of PipelineEngine
 * @param  {PipelineEngine} pipeline - Pipeline engine to test
 */
function testPipelineEngine(pipeline: PipelineEngine) {
  // empty method
  describe("#empty", () => {
    it("should create a PipelineStage which emits no items", async () => {
      const out = pipeline.empty();
      let cpt = 0;
      for await (const x of out) {
        cpt++;
      }
      expect(cpt).to.equal(0);
    });
  });

  // of method
  describe("#of", () => {
    it("should create a PipelineStage from a single element", async () => {
      const out = pipeline.of(1);
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(1);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });

    it("should create a PipelineStage from several elements", async () => {
      const out = pipeline.of(1, 2, 3);
      const expected = [1, 2, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });
  });

  // from method
  describe("#from", () => {
    it("should create a PipelineStage from an array", async () => {
      const out = pipeline.from([1, 2, 3]);
      const expected = [1, 2, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });

    it("should create a PipelineStage from a Promise", async () => {
      const out = pipeline.from(Promise.resolve(1));
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(1);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });

    it("should create a PipelineStage from another PipelineStage", async () => {
      const out = pipeline.from(pipeline.of(1));
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(1);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });
  });

  describe("#fromAsync", () => {
    it("should create a PipelineStage from an async source of values", async () => {
      const expected = [1, 2, 3];
      const out = pipeline.fromAsync<number>((input) => {
        setTimeout(() => {
          input.next(1);
          input.next(2);
          setTimeout(() => {
            input.next(3);
            input.complete();
          }, 5);
        }, 5);
      });
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });

    it("should catch errors when generating values asynchronously", async () => {
      const out = pipeline.fromAsync((input) => {
        setTimeout(() => {
          input.error();
        }, 5);
      });
      let cpt = 0;
      try {
        for await (const x of out) {
        }
        expect.fail("The pipeline should not complete when an error is thrown");
      } catch {
        expect(cpt).to.equal(0);
      }
    });
  });

  // clone method
  describe("#clone", () => {
    it("should clone an existing PipelineStage", async () => {
      const source = pipeline.of(1, 2, 3);
      const out = pipeline.clone(source);
      const expected = [1, 2, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });
  });

  describe("#catch", () => {
    it("should catch errors raised inside the pipeline", async () => {
      const source = pipeline.map(pipeline.of(1, 2, 3), () => {
        throw new Error();
      });
      const out = pipeline.catch(source, (err) => {
        return pipeline.of(5);
      });
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(5);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });
  });

  // merge method
  describe("#merge", () => {
    it("should merge two PipelineStage into a single one", async () => {
      const out = pipeline.merge(pipeline.of(1, 2), pipeline.of(3));
      const expected = [1, 2, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });

    it("should merge three PipelineStage into a single one", async () => {
      const out = pipeline.merge(
        pipeline.of(1, 2),
        pipeline.of(3),
        pipeline.of(4, 5)
      );
      const expected = [1, 2, 3, 4, 5];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(5);
      expect(expected.length).to.equal(0);
    });
  });

  // map method
  describe("#map", () => {
    it("should transform items of a PipelineStage", async () => {
      const out = pipeline.map(pipeline.of(1, 2, 3), (x) => x * 2);
      const expected = [2, 4, 6];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });
  });

  // mergeMap method
  describe("#mergeMap", () => {
    it("should transform items of a PipelineStage using PipelineStage that emits one item", async () => {
      const out = pipeline.mergeMap(pipeline.of(1, 2, 3), (x) =>
        pipeline.of(x * 2)
      );
      const expected = [2, 4, 6];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });

    it("should transform items of a PipelineStage using PipelineStage that emits several items", async () => {
      const out = pipeline.mergeMap(pipeline.of(1, 2, 3), (x) =>
        pipeline.of(x * 2, x * 3)
      );
      const expected = [2, 4, 6, 3, 6, 9];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(6);
      expect(expected.length).to.equal(0);
    });
  });

  // flatMap method
  describe("#flatMap", () => {
    it("shoudl transform items of a PipelineStage into flattened array of items", async () => {
      const out = pipeline.flatMap(pipeline.of(1, 2, 3), (x) => [x * 2, x * 3]);
      const expected = [2, 4, 6, 3, 6, 9];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(6);
      expect(expected.length).to.equal(0);
    });
  });

  // flatten method
  describe("#flattend", () => {
    it("shoudl flatten the output of a PipelineStage that emits array of values", async () => {
      const out = pipeline.flatten(pipeline.of([1, 2], [3, 4], [5, 6]));
      const expected = [1, 2, 3, 4, 5, 6];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(6);
      expect(expected.length).to.equal(0);
    });
  });

  // reduce method
  describe("#reduce", () => {
    it("should reduce elements emitted by a PipelineStage", async () => {
      const out = pipeline.reduce(pipeline.of(1, 2, 3), (acc, x) => acc + x, 0);
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(6);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });

    it("should reduce elements emitted by an empty PipelineStage into the initial value", async () => {
      const out = pipeline.reduce(
        pipeline.empty<number>(),
        (acc, x) => acc + x,
        0
      );
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(0);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });
  });

  // limit method
  describe("#limit", () => {
    it("should limit the output of a PipelineStage", async () => {
      const out = pipeline.limit(pipeline.of(1, 2, 3, 4, 5), 2);
      const expected = [1, 2, 3, 4, 5];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(2);
      expect(expected.length).to.equal(3);
    });

    it("should limit the output of an empty PipelineStage", async () => {
      const out = pipeline.limit(pipeline.empty(), 2);
      let cpt = 0;
      for await (const x of out) {
        cpt++;
      }
      expect(cpt).to.equal(0);
    });

    it("should work if the limit is higher that the number of items emitted by a PipelineStage", async () => {
      const out = pipeline.limit(pipeline.of(1, 2, 3, 4, 5), 12);
      const expected = [1, 2, 3, 4, 5];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(5);
      expect(expected.length).to.equal(0);
    });
  });

  // skip method
  describe("#skip", () => {
    it("should skip the output of a PipelineStage", async () => {
      const out = pipeline.skip(pipeline.of(1, 2, 3, 4, 5), 2);
      const expected = [1, 2, 3, 4, 5];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        // pull out element
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(2);
    });

    it("should skip the output of an empty PipelineStage", async () => {
      const out = pipeline.skip(pipeline.empty(), 2);
      let cpt = 0;
      for await (const x of out) {
        cpt++;
      }
      expect(cpt).to.equal(0);
    });

    it("should work if the skip is higher that the number of items emitted by a PipelineStage", async () => {
      const out = pipeline.skip(pipeline.of(1, 2, 3, 4, 5), 12);
      let cpt = 0;
      for await (const x of out) {
        cpt++;
      }
      expect(cpt).to.equal(0);
    });
  });

  // distinct method
  describe("#distinct", () => {
    it("should remove duplicated elements emitted by a PipelineStage", async () => {
      const out = pipeline.distinct(pipeline.of(1, 1, 2, 2, 3, 3));
      const expected = [1, 2, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });

    it("should remove duplicated elements using a selector function", async () => {
      const out = pipeline.distinct(pipeline.of(1, 2, 3), (x) =>
        x === 2 ? 1 : x
      );
      const expected = [1, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(2);
      expect(expected.length).to.equal(0);
    });
  });

  // forEach method
  describe("#forEach", () => {
    it("should invoke a callback on each item emitted by a PipelineStage", (t, done) => {
      let cpt = 0;
      const expected = [1, 2, 3];
      pipeline.forEach(pipeline.of(1, 2, 3), (x) => {
        expect(x).to.be.oneOf(expected);
        expected.splice(expected.indexOf(x), 1);
        cpt++;
        if (cpt === 3) {
          expect(expected.length).to.equal(0);
          done();
        }
      });
    });
  });

  // defaultValues method
  describe("#defaultValues", () => {
    it("should set a (single) default for an empty PipelineStage", async () => {
      const out = pipeline.defaultValues(pipeline.empty(), 1);
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.equal(1);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });

    it("should set several default values for an empty PipelineStage", async () => {
      const out = pipeline.defaultValues<number>(pipeline.empty(), 1, 2, 3);
      const expected = [1, 2, 3];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(3);
      expect(expected.length).to.equal(0);
    });
  });

  // bufferCount method
  describe("#bufferCount", () => {
    it("should buffer items emitted by a PipelineStage", async () => {
      const out = pipeline.bufferCount(pipeline.of(1, 2, 3, 4), 2);
      const expected = [1, 2, 3, 4];
      let cpt = 0;
      for await (const chunk of out) {
        expect(chunk.length).to.equal(2);
        for (const x of chunk) {
          expect(x).to.be.oneOf(expected);
          expected.splice(expected.indexOf(x), 1);
          cpt++;
        }
      }
      expect(cpt).to.equal(4);
      expect(expected.length).to.equal(0);
    });

    it("should buffer items even if the buffer size is higher that the total number of items produced", async () => {
      const out = pipeline.bufferCount(pipeline.of(1, 2, 3, 4), 5);
      const expected = [1, 2, 3, 4];
      let cpt = 0;
      for await (const chunk of out) {
        expect(chunk.length).to.equal(4);
        for (const x of chunk) {
          expect(x).to.be.oneOf(expected);
          expected.splice(expected.indexOf(x), 1);
          cpt++;
        }
      }
      expect(cpt).to.equal(4);
      expect(expected.length).to.equal(0);
    });
  });

  // collect method
  describe("#collect", () => {
    it("should collect all values emitted by a PipelineStage as an array", async () => {
      const out = pipeline.collect(pipeline.of(1, 2, 3, 4));
      const expected = [1, 2, 3, 4];
      let cpt = 0;
      for await (const chunk of out) {
        expect(chunk.length).to.equal(4);
        for (const x of chunk) {
          expect(x).to.be.oneOf(expected);
          expected.splice(expected.indexOf(x), 1);
        }
        cpt++;
      }
      expect(cpt).to.equal(1);
      expect(expected.length).to.equal(0);
    });

    it("should produce an empty array when applied to an empty PipelineStage", async () => {
      const out = pipeline.collect(pipeline.empty());
      let cpt = 0;
      for await (const chunk of out) {
        expect(chunk.length).to.equal(0);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });
  });

  // first method
  describe("#first", () => {
    it("should emit the first item of the PipelineStage", async () => {
      const out = pipeline.first(pipeline.of(1, 2));
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf([1, 2]);
        cpt++;
      }
      expect(cpt).to.equal(1);
    });
  });

  // endWith method
  describe("#endsWith", () => {
    it("should append items at the end of the PipelineStage", async () => {
      const out = pipeline.endWith<number>(pipeline.empty(), [1, 2, 3, 4]);
      const expected = [1, 2, 3, 4];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(4);
      expect(expected.length).to.equal(0);
    });
  });

  // tap method
  describe("#tap", () => {
    it("should invoke a function on each item in a PipelineStage, then forward the item", async () => {
      let nbTaps = 0;
      const out = pipeline.tap(pipeline.of(1, 2, 3, 4), () => nbTaps++);
      const expected = [1, 2, 3, 4];
      let cpt = 0;
      for await (const x of out) {
        expect(x).to.be.oneOf(expected);
        expected.splice(expected.indexOf(x), 1);
        cpt++;
      }
      expect(cpt).to.equal(4);
      expect(nbTaps).to.equal(4);
      expect(expected.length).to.equal(0);
    });

    it("should not invoke the function when applied to an empty PipelineStage", async () => {
      let nbTaps = 0;
      const out = pipeline.tap(pipeline.empty(), () => nbTaps++);
      let cpt = 0;
      for await (const x of out) {
        cpt++;
      }
      expect(cpt).to.equal(0);
      expect(nbTaps).to.equal(0);
    });
  });
}

export default testPipelineEngine;

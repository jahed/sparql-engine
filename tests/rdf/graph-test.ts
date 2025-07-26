/* file : graph-test.js
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import { expect } from "chai";
import { describe, it } from "node:test";
import type { Algebra } from "sparqljs";
import { ExecutionContext, Graph, type PipelineInput } from "../../src/api.ts";

describe("Graph", () => {
  class TestGraph extends Graph {
    insert(triple: Algebra.TripleObject): Promise<void> {
      throw new Error("Method not implemented.");
    }
    delete(triple: Algebra.TripleObject): Promise<void> {
      throw new Error("Method not implemented.");
    }
    find(
      pattern: Algebra.TripleObject,
      context: ExecutionContext
    ): PipelineInput<Algebra.TripleObject> {
      throw new Error("Method not implemented.");
    }
    clear(): Promise<void> {
      throw new Error("Method not implemented.");
    }
  }

  it('should enforce subclasses to implement an "insert" method', () => {
    const g = new TestGraph();
    expect(() => g.insert({ subject: "", predicate: "", object: "" })).to.throw(
      Error
    );
  });

  it('should enforce subclasses to implement a "delete" method', () => {
    const g = new TestGraph();
    expect(() => g.delete({ subject: "", predicate: "", object: "" })).to.throw(
      Error
    );
  });

  it('should enforce subclasses to implement a "find" method', () => {
    const g = new TestGraph();
    expect(() =>
      g.find({ subject: "", predicate: "", object: "" }, new ExecutionContext())
    ).to.throw(Error);
  });

  it('should enforce subclasses to implement a "clear" method', () => {
    const g = new TestGraph();
    expect(() => g.clear()).to.throw(Error);
  });
});

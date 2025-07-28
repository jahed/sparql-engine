/*
MIT License

Copyright (c) 2025 The SPARQL Engine Authors.

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
import {
  ExecutionContext,
  Graph,
  type PipelineInput,
} from "../../src/index.ts";
import type { EngineTriple } from "../../src/types.ts";
import { dataFactory } from "../../src/utils/rdf.ts";

describe("Graph", () => {
  class TestGraph extends Graph {
    insert(triple: EngineTriple): Promise<void> {
      throw new Error("Method not implemented.");
    }
    delete(triple: EngineTriple): Promise<void> {
      throw new Error("Method not implemented.");
    }
    find(
      pattern: EngineTriple,
      context: ExecutionContext
    ): PipelineInput<EngineTriple> {
      throw new Error("Method not implemented.");
    }
    clear(): Promise<void> {
      throw new Error("Method not implemented.");
    }
  }

  function testQuad() {
    return dataFactory.quad(
      dataFactory.namedNode("s"),
      dataFactory.namedNode("p"),
      dataFactory.namedNode("o")
    );
  }

  it('should enforce subclasses to implement an "insert" method', () => {
    const g = new TestGraph();
    expect(() => g.insert(testQuad())).to.throw(Error);
  });

  it('should enforce subclasses to implement a "delete" method', () => {
    const g = new TestGraph();
    expect(() => g.delete(testQuad())).to.throw(Error);
  });

  it('should enforce subclasses to implement a "find" method', () => {
    const g = new TestGraph();
    expect(() => g.find(testQuad(), new ExecutionContext())).to.throw(Error);
  });

  it('should enforce subclasses to implement a "clear" method', () => {
    const g = new TestGraph();
    expect(() => g.clear()).to.throw(Error);
  });
});

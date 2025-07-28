// SPDX-License-Identifier: MIT
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

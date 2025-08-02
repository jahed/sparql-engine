// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { describe, it } from "node:test";
import ExecutionContext from "../../src/engine/context/execution-context.ts";
import type { PipelineInput } from "../../src/engine/pipeline/pipeline-engine.ts";
import Graph from "../../src/rdf/graph.ts";
import type { EngineTriple } from "../../src/types.ts";
import { RDF } from "../../src/utils/rdf.ts";

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
    return RDF.quad(RDF.namedNode("s"), RDF.namedNode("p"), RDF.namedNode("o"));
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

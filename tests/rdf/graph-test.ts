// SPDX-License-Identifier: MIT
import ExecutionContext from "@jahed/sparql-engine/engine/context/execution-context.ts";
import type { PipelineInput } from "@jahed/sparql-engine/engine/pipeline/pipeline-engine.ts";
import Graph from "@jahed/sparql-engine/rdf/graph.ts";
import type { EngineTriple } from "@jahed/sparql-engine/types.ts";
import { RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import { describe, it } from "node:test";

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

// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { describe, it } from "node:test";
import {
  Dataset,
  ExecutionContext,
  Graph,
  HashMapDataset,
  type PipelineInput,
} from "../../src/index.ts";
import type { EngineIRI, EngineTriple } from "../../src/types.ts";
import { createIRI } from "../../src/utils/rdf.ts";

describe("Dataset", () => {
  class TestDataset extends Dataset {
    get iris(): EngineIRI[] {
      throw new Error("Method not implemented.");
    }
    setDefaultGraph(g: Graph): void {
      throw new Error("Method not implemented.");
    }
    getDefaultGraph(): Graph {
      throw new Error("Method not implemented.");
    }
    addNamedGraph(iri: EngineIRI, g: Graph): void {
      throw new Error("Method not implemented.");
    }
    getNamedGraph(iri: EngineIRI): Graph {
      throw new Error("Method not implemented.");
    }
    deleteNamedGraph(iri: EngineIRI): void {
      throw new Error("Method not implemented.");
    }
    hasNamedGraph(iri: EngineIRI): boolean {
      throw new Error("Method not implemented.");
    }
  }

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

  it('should enforce subclasses to implement a "setDefaultGraph" method', () => {
    const d = new TestDataset();
    expect(() => d.setDefaultGraph(new TestGraph())).to.throw(Error);
  });

  it('should enforce subclasses to implement a "getDefaultGraph" method', () => {
    const d = new TestDataset();
    expect(() => d.getDefaultGraph()).to.throw(Error);
  });

  it('should enforce subclasses to implement a "addNamedGraph" method', () => {
    const d = new TestDataset();
    expect(() => d.addNamedGraph(createIRI(""), new TestGraph())).to.throw(
      Error
    );
  });

  it('should enforce subclasses to implement a "getNamedGraph" method', () => {
    const d = new TestDataset();
    expect(() => d.getNamedGraph(createIRI(""))).to.throw(Error);
  });

  it('should provides a generic "getAllGraphs()" implementation', () => {
    const gA = new TestGraph();
    const gB = new TestGraph();
    const GRAPH_A_IRI = createIRI("http://example.org#A");
    const GRAPH_B_IRI = createIRI("http://example.org#B");
    const d = new HashMapDataset(GRAPH_A_IRI, gA);
    d.addNamedGraph(GRAPH_B_IRI, gB);
    const all = d.getAllGraphs();
    expect(all.length).to.equal(2);
    all.forEach((g) => {
      expect(g.iri).to.be.oneOf([GRAPH_A_IRI, GRAPH_B_IRI]);
    });
  });

  describe("#getUnionGraph", () => {
    const gA = new TestGraph();
    const gB = new TestGraph();
    const GRAPH_A_IRI = createIRI("http://example.org#A");
    const GRAPH_B_IRI = createIRI("http://example.org#B");
    const d = new HashMapDataset(GRAPH_A_IRI, gA);
    d.addNamedGraph(GRAPH_B_IRI, gB);

    it("should provides an UnionGraph (including the Default Graph)", () => {
      const union = d.getUnionGraph([GRAPH_B_IRI], true);
      expect(union._graphs.length).to.equal(2);
      union._graphs.forEach((g) => {
        expect(g.iri).to.be.oneOf([GRAPH_A_IRI, GRAPH_B_IRI]);
      });
    });

    it("should provides an UnionGraph (excluding the Default Graph)", () => {
      const union = d.getUnionGraph([GRAPH_B_IRI], false);
      expect(union._graphs.length).to.equal(1);
      expect(union._graphs[0].iri).to.equal(GRAPH_B_IRI);
    });
  });
});

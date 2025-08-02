// SPDX-License-Identifier: MIT
import type ExecutionContext from "@jahed/sparql-engine/engine/context/execution-context.ts";
import type { PipelineInput } from "@jahed/sparql-engine/engine/pipeline/pipeline-engine.ts";
import Dataset from "@jahed/sparql-engine/rdf/dataset.ts";
import Graph from "@jahed/sparql-engine/rdf/graph.ts";
import HashMapDataset from "@jahed/sparql-engine/rdf/hashmap-dataset.ts";
import type { EngineIRI, EngineTriple } from "@jahed/sparql-engine/types.ts";
import { RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import { describe, it } from "node:test";

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
    addNamedGraph(g: Graph): void {
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
    expect(() => d.addNamedGraph(new TestGraph())).to.throw(Error);
  });

  it('should enforce subclasses to implement a "getNamedGraph" method', () => {
    const d = new TestDataset();
    expect(() => d.getNamedGraph(RDF.namedNode(""))).to.throw(Error);
  });

  it('should provides a generic "getAllGraphs()" implementation', () => {
    const gA = new TestGraph(RDF.namedNode("http://example.org#A"));
    const gB = new TestGraph(RDF.namedNode("http://example.org#B"));
    const d = new HashMapDataset(gA);
    d.addNamedGraph(gB);
    const all = d.getAllGraphs();
    expect(all.length).to.equal(2);
    all.forEach((g) => {
      expect(g.iri).to.be.oneOf([gA.iri, gB.iri]);
    });
  });

  describe("#getUnionGraph", () => {
    const gA = new TestGraph(RDF.namedNode("http://example.org#A"));
    const gB = new TestGraph(RDF.namedNode("http://example.org#B"));
    const d = new HashMapDataset(gA);
    d.addNamedGraph(gB);

    it("should provides an UnionGraph (including the Default Graph)", () => {
      const union = d.getUnionGraph([gB.iri], true);
      expect(union._graphs.length).to.equal(2);
      union._graphs.forEach((g) => {
        expect(g.iri).to.be.oneOf([gA.iri, gB.iri]);
      });
    });

    it("should provides an UnionGraph (excluding the Default Graph)", () => {
      const union = d.getUnionGraph([gB.iri], false);
      expect(union._graphs.length).to.equal(1);
      expect(union._graphs[0].iri).to.equal(gB.iri);
    });
  });
});

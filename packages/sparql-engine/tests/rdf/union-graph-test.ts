// SPDX-License-Identifier: MIT
import { getGraph } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { stringToTerm, termToString } from "rdf-string";
import { ExecutionContext, RxjsPipeline } from "../../src/index.ts";
import UnionGraph from "../../src/rdf/union-graph.ts";
import { createIRI, dataFactory } from "../../src/utils/rdf.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("Union Graph", () => {
  let gA: ReturnType<typeof getGraph>;
  let gB: ReturnType<typeof getGraph>;
  beforeEach(() => {
    gA = getGraph("dblp.nt");
    gA.iri = GRAPH_A_IRI;
    gB = getGraph("dblp.nt");
    gB.iri = GRAPH_B_IRI;
  });

  describe("#insert", () => {
    it("should evaluates insertion of the left-most graphs of the Union", async () => {
      const union = new UnionGraph([gA, gB]);
      const triple = dataFactory.quad(
        createIRI("http://example.org#toto"),
        createIRI("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        createIRI("http://example.org#Person")
      );
      await union.insert(triple);
      // check triples have been inserted in gA and not gB
      let triples = gA._store.getTriples(
        termToString(triple.subject),
        termToString(triple.predicate),
        termToString(triple.object)
      );
      expect(triples.length).to.equal(1);
      expect(stringToTerm(triples[0].subject)).to.deep.equal(triple.subject);
      expect(stringToTerm(triples[0].predicate)).to.deep.equal(
        triple.predicate
      );
      expect(stringToTerm(triples[0].object)).to.deep.equal(triple.object);
      triples = gB._store.getTriples(
        termToString(triple.subject),
        termToString(triple.predicate),
        termToString(triple.object)
      );
      expect(triples.length).to.equal(0);
    });
  });

  describe("#delete", () => {
    it("should evaluates deletions on all graphs in the Union", async () => {
      const union = new UnionGraph([gA, gB]);
      const triple = dataFactory.quad(
        createIRI("https://dblp.org/pers/m/Minier:Thomas"),
        createIRI("https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf"),
        createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a")
      );
      await union.delete(triple);
      // check triples have been inserted in gA and not gB
      let triples = gA._store.getTriples(
        termToString(triple.subject),
        termToString(triple.predicate),
        termToString(triple.object)
      );
      expect(triples.length).to.equal(0);
      triples = gB._store.getTriples(
        termToString(triple.subject),
        termToString(triple.predicate),
        termToString(triple.object)
      );
      expect(triples.length).to.equal(0);
    });
  });

  describe("#find", () => {
    it("should searches for RDF triples in all graphs", async () => {
      const union = new UnionGraph([gA, gB]);
      const triple = dataFactory.quad(
        createIRI("https://dblp.org/pers/m/Minier:Thomas"),
        createIRI("https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf"),
        dataFactory.variable("article")
      );
      let nbResults = 0;
      let expectedArticles = [
        createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
        createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
        createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
        createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
        createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
        createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
        createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
        createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
        createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
        createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
      ];
      for await (const b of new RxjsPipeline().from(
        union.find(triple, new ExecutionContext())
      )) {
        expect(b.subject).to.deep.equal(triple.subject);
        expect(b.predicate).to.deep.equal(triple.predicate);
        expect(b.object).to.be.deep.oneOf(expectedArticles);
        const index = expectedArticles.findIndex((v) => v.equals(b.object));
        expectedArticles.splice(index, 1);
        nbResults++;
      }
      expect(nbResults).to.equal(10);
      expect(expectedArticles.length).to.equal(0);
    });
  });
});

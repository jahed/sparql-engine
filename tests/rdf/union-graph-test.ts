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
import { beforeEach, describe, it } from "node:test";
import { stringToTerm, termToString } from "rdf-string";
import { ExecutionContext, RxjsPipeline } from "../../src/api.ts";
import UnionGraph from "../../src/rdf/union-graph.ts";
import { createIRI, dataFactory } from "../../src/utils/rdf.ts";
import { getGraph } from "../utils.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("Union Graph", () => {
  let gA: ReturnType<typeof getGraph>;
  let gB: ReturnType<typeof getGraph>;
  beforeEach(() => {
    gA = getGraph("./tests/data/dblp.nt");
    gA.iri = GRAPH_A_IRI;
    gB = getGraph("./tests/data/dblp.nt");
    gB.iri = GRAPH_B_IRI;
  });

  describe("#insert", () => {
    it("should evaluates insertion of the left-most graphs of the Union", (t, done) => {
      const union = new UnionGraph([gA, gB]);
      const triple = dataFactory.quad(
        createIRI("http://example.org#toto"),
        createIRI("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        createIRI("http://example.org#Person")
      );
      union.insert(triple).then(() => {
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
        done();
      });
    });
  });

  describe("#delete", () => {
    it("should evaluates deletions on all graphs in the Union", (t, done) => {
      const union = new UnionGraph([gA, gB]);
      const triple = dataFactory.quad(
        createIRI("https://dblp.org/pers/m/Minier:Thomas"),
        createIRI("https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf"),
        createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a")
      );
      union.delete(triple).then(() => {
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
        done();
      });
    });
  });

  describe("#find", () => {
    it("should searches for RDF triples in all graphs", (t, done) => {
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
      const iterator = new RxjsPipeline().from(
        union.find(triple, new ExecutionContext())
      );

      iterator.subscribe(
        (b) => {
          expect(b.subject).to.deep.equal(triple.subject);
          expect(b.predicate).to.deep.equal(triple.predicate);
          expect(b.object).to.be.deep.oneOf(expectedArticles);
          const index = expectedArticles.findIndex((v) => v.equals(b.object));
          expectedArticles.splice(index, 1);
          nbResults++;
        },
        done,
        () => {
          expect(nbResults).to.equal(10);
          expect(expectedArticles.length).to.equal(0);
          done();
        }
      );
    });
  });
});

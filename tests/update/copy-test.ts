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
import { termToString } from "rdf-string";
import { createIRI } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SPARQL UPDATE: COPY queries", () => {
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("./tests/data/dblp.nt");
    const gB = getGraph("./tests/data/dblp2.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine.addNamedGraph(GRAPH_B_IRI, gB);
  });

  const data = [
    {
      name: "COPY DEFAULT to NAMED",
      query: `COPY DEFAULT TO <${termToString(GRAPH_B_IRI)}>`,
      testFun: () => {
        // destination graph should only contains data from the source
        let triples = engine
          .getNamedGraph(GRAPH_B_IRI)
          ._store.getTriples("https://dblp.org/pers/m/Minier:Thomas");
        expect(triples.length).to.equal(11);
        triples = engine
          .getNamedGraph(GRAPH_B_IRI)
          ._store.getTriples("https://dblp.org/pers/g/Grall:Arnaud");
        expect(triples.length).to.equal(0);
        // source graph should not be empty
        triples = engine._graph._store.getTriples();
        expect(triples.length).to.not.equal(0);
      },
    },
    {
      name: "COPY NAMED to DEFAULT",
      query: `COPY <${termToString(GRAPH_B_IRI)}> TO DEFAULT`,
      testFun: () => {
        // destination graph should only contains data from the source
        let triples = engine._graph._store.getTriples(
          "https://dblp.org/pers/g/Grall:Arnaud"
        );
        expect(triples.length).to.equal(10);
        triples = engine._graph._store.getTriples(
          "https://dblp.org/pers/m/Minier:Thomas"
        );
        expect(triples.length).to.equal(0);
        // source graph should not be empty
        triples = engine.getNamedGraph(GRAPH_B_IRI)._store.getTriples();
        expect(triples.length).to.not.equal(0);
      },
    },
  ];

  data.forEach((d) => {
    it(`should evaluate "${d.name}" queries`, (t, done) => {
      engine.execute(d.query).subscribe(undefined, done, () => {
        d.testFun();
        done();
      });
    });
  });
});

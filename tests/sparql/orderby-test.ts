/* file : orderby-test.js
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
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/api.ts";
import { createIRI, termToValue } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("ORDER BY queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate queries with a simple ORDER BY", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }
    ORDER BY ?article`;
    const results = [
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
    ];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b["article"]).to.deep.equal(results[0]);
      results.shift();
    }
    expect(results.length).to.equal(0);
  });

  it("should evaluate queries with a simple descending ORDER BY", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }
    ORDER BY DESC(?article)`;
    const results = [
      createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
    ];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b["article"]).to.deep.equal(results[0]);
      results.shift();
    }
    expect(results.length).to.equal(0);
  });

  it("should evaluate queries with multiples comparators", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }
    ORDER BY ?name DESC(?article)`;
    const results = [
      createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
    ];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b["article"]).to.deep.equal(results[0]);
      results.shift();
    }

    expect(results.length).to.equal(0);
  });

  it("should order by integers", async () => {
    for await (const _ of engine.execute(`
      PREFIX : <http://example.org/ns#>
      INSERT DATA { :n100 :length 100 } ;
      INSERT DATA { :n1 :length 1 } ;
      INSERT DATA { :n10 :length 10 } ;
      INSERT DATA { :n9 :length 9 } ;
      INSERT DATA { :n5 :length 5 } ;
    `));

    const results: number[] = [];
    for await (const bindings of engine.execute(`
      PREFIX : <http://example.org/ns#>
      SELECT ?o
      WHERE { ?s :length ?o . }
      ORDER BY ?o
    `)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      const o = termToValue<number>(b["o"]);
      results.push(o);
    }
    expect(results).to.deep.equal([1, 5, 9, 10, 100]);
  });
});

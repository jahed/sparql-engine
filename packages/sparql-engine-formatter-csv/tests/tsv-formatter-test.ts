// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import { before, describe, it } from "node:test";
import { tsvFormatter } from "../src/index.ts";

describe("W3C TSV formatter", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate SELECT queries", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    let results = "";
    const expected = `name\tarticle
"Thomas Minier"@en\thttps://dblp.org/rec/conf/esws/MinierMSM17a
"Thomas Minier"@en\thttps://dblp.org/rec/conf/esws/MinierMSM17
"Thomas Minier"@en\thttps://dblp.org/rec/journals/corr/abs-1806-00227
"Thomas Minier"@en\thttps://dblp.org/rec/conf/esws/MinierSMV18
"Thomas Minier"@en\thttps://dblp.org/rec/conf/esws/MinierSMV18a
`;
    for await (const b of engine.execute(query).pipe(tsvFormatter)) {
      results += b;
    }
    expect(results).to.equals(expected);
  });

  it("should evaluate ASK queries", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    ASK {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    let results = "";
    const expected = `boolean
true
`;
    for await (const b of engine.execute(query).pipe(tsvFormatter)) {
      results += b;
    }
    expect(results).to.equals(expected);
  });
});

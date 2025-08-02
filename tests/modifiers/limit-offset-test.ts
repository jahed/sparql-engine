// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/rdf/bindings.ts";
import { RDF } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL queries with LIMIT/OFFSET", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  const data = [
    {
      text: "should evaluate SPARQL queries with OFFSET",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
      OFFSET 2`,
      results: [
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18"),
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18a"),
        RDF.namedNode("https://dblp.org/rec/journals/corr/abs-1806-00227"),
      ],
    },
    {
      text: "should evaluate SPARQL queries with LIMIT",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
      LIMIT 2`,
      results: [
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17"),
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17a"),
      ],
    },
    {
      text: "should evaluate SPARQL queries with LIMIT & OFFSET",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }
      OFFSET 3
      LIMIT 2`,
      results: [
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18"),
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      ],
    },
  ];

  data.forEach((d) => {
    it(d.text, async () => {
      const expectedCardinality = d.results.length;
      let nbResults = 0;
      for await (const bindings of engine.execute(d.query)) {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b["article"]).to.be.deep.oneOf(d.results);
        d.results.splice(
          d.results.findIndex((r) => r.equals(b["article"])),
          1
        );
        nbResults++;
      }
      expect(nbResults).to.equal(expectedCardinality);
    });
  });
});

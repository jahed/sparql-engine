// SPDX-License-Identifier: MIT
import type { BindingsRecord } from "@jahed/sparql-engine/rdf/bindings.ts";
import { BindingBase } from "@jahed/sparql-engine/rdf/bindings.ts";
import { createLangLiteral, RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { createGraph, TestEngine } from "../utils.ts";

describe("SERVICE queries (using bound joins)", () => {
  const GRAPH_A_IRI = RDF.namedNode("http://example.org#some-graph-a");
  const GRAPH_B_IRI = RDF.namedNode("http://example.org#some-graph-b");
  const gA = createGraph("./tests/data/dblp.nt", true, GRAPH_A_IRI);
  const gB = createGraph("./tests/data/dblp2.nt", true, GRAPH_B_IRI);
  let engine: TestEngine;
  beforeEach(() => {
    engine = new TestEngine(gA);
    engine._dataset.setGraphFactory((iri) => (iri.equals(gB.iri) ? gB : gA));
  });

  const data: {
    text: string;
    query: string;
    nbResults: number;
    testFun: (b: BindingsRecord) => void;
  }[] = [
    {
      text: "should evaluate simple SPARQL SERVICE queries using the bound join algorithm",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?name ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        SERVICE <${termToString(gA.iri)}> {
          ?s dblp-rdf:primaryFullPersonName ?name .
          ?s dblp-rdf:authorOf ?article .
        }
      }`,
      nbResults: 5,
      testFun: function (b) {
        expect(b).to.have.all.keys(["name", "article"]);
        expect(b["name"]).to.deep.equal(
          createLangLiteral("Thomas Minier", "en")
        );
        expect(b["article"]).to.be.deep.oneOf([
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18a"),
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18"),
          RDF.namedNode("https://dblp.org/rec/journals/corr/abs-1806-00227"),
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17"),
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17a"),
        ]);
      },
    },
    {
      text: "should evaluate simple SERVICE queries that requires containement queries",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        SERVICE <${termToString(gA.iri)}> {
          ?s dblp-rdf:primaryFullPersonName "Thomas Minier"@en .
        }
      }`,
      nbResults: 1,
      testFun: function (b) {
        expect(b["s"]).to.deep.equal(
          RDF.namedNode("https://dblp.org/pers/m/Minier:Thomas")
        );
      },
    },
    {
      text: "should evaluate complex SERVICE queries that requires containement queries",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?s ?article WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:authorOf ?article .
        SERVICE <${termToString(gA.iri)}> {
          ?s dblp-rdf:primaryFullPersonName "Thomas Minier"@en .
        }
      }`,
      nbResults: 5,
      testFun: function (b) {
        expect(b["s"]).to.deep.equal(
          RDF.namedNode("https://dblp.org/pers/m/Minier:Thomas")
        );
        expect(b["article"]).to.be.deep.oneOf([
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18a"),
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18"),
          RDF.namedNode("https://dblp.org/rec/journals/corr/abs-1806-00227"),
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17"),
          RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17a"),
        ]);
      },
    },
  ];

  data.forEach((d) => {
    it(d.text, async () => {
      let nbResults = 0;
      for await (const bindings of engine.execute(d.query)) {
        assert(bindings instanceof BindingBase);
        d.testFun(bindings.toObject());
        nbResults++;
      }
      expect(nbResults).to.equal(d.nbResults);
    });
  });
});

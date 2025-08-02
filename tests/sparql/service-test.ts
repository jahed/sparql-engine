// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import type { BindingsRecord } from "../../src/rdf/bindings.ts";
import { BindingBase } from "../../src/rdf/bindings.ts";
import { createLangLiteral, RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine } from "../utils.ts";

describe("SERVICE queries", () => {
  const GRAPH_A_IRI = RDF.namedNode("http://example.org#some-graph-a");
  const GRAPH_B_IRI = RDF.namedNode("http://example.org#some-graph-b");

  let engine: TestEngine;
  const gA = createGraph("./tests/data/dblp.nt", undefined, GRAPH_A_IRI);
  const gB = createGraph("./tests/data/dblp2.nt", undefined, GRAPH_B_IRI);
  beforeEach(() => {
    engine = new TestEngine(gA);
    engine._dataset.setGraphFactory((iri) => (iri.equals(gB.iri) ? gB : gA));
  });

  const data: {
    text: string;
    query: string;
    nbResults: number;
    testFun: (bindings: BindingsRecord) => void;
  }[] = [
    {
      text: "should evaluate simple SPARQL SERVICE queries",
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
      text: "should evaluate SPARQL SERVICE queries where at least one RDF Graph needs to be auto-created",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s dblp-rdf:coCreatorWith ?coCreator .
        SERVICE <${termToString(gB.iri)}> {
          ?s2 dblp-rdf:coCreatorWith ?coCreator .
          ?s2 dblp-rdf:primaryFullPersonName ?name .
        }
      }`,
      nbResults: 3,
      testFun: function (b) {
        expect(b["s"]).to.deep.equal(
          RDF.namedNode("https://dblp.org/pers/m/Minier:Thomas")
        );
        expect(b["s2"]).to.deep.equal(
          RDF.namedNode("https://dblp.org/pers/g/Grall:Arnaud")
        );
        expect(b["name"]).to.deep.equal(RDF.literal("Arnaud Grall"));
        expect(b["coCreator"]).to.be.deep.oneOf([
          RDF.namedNode("https://dblp.org/pers/m/Molli:Pascal"),
          RDF.namedNode("https://dblp.org/pers/m/Montoya:Gabriela"),
          RDF.namedNode("https://dblp.org/pers/s/Skaf=Molli:Hala"),
        ]);
      },
    },
  ];

  data.forEach((d) => {
    it(d.text, async () => {
      let nbResults = 0;
      for await (const bindings of engine.execute(d.query)) {
        assert(bindings instanceof BindingBase);
        const b = bindings.toObject();
        d.testFun(b);
        nbResults++;
      }
      expect(nbResults).to.equal(d.nbResults);
    });
  });
});

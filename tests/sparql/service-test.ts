// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { BindingBase } from "../../src/index.ts";
import type { BindingsRecord } from "../../src/rdf/bindings.ts";
import {
  createIRI,
  createLangLiteral,
  createLiteral,
} from "../../src/utils/rdf.ts";
import { getGraph, TestEngine, type TestGraph } from "../utils.ts";

const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");

describe("SERVICE queries", () => {
  let engine: TestEngine;
  let gA: TestGraph;
  let gB: TestGraph;
  beforeEach(() => {
    gA = getGraph("./tests/data/dblp.nt");
    gB = getGraph("./tests/data/dblp2.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine._dataset.setGraphFactory((iri) => {
      if (iri.equals(GRAPH_B_IRI)) {
        return gB;
      }
      return gA;
    });
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
        SERVICE <${termToString(GRAPH_A_IRI)}> {
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
          createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
          createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
          createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
          createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
          createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
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
        SERVICE <${termToString(GRAPH_B_IRI)}> {
          ?s2 dblp-rdf:coCreatorWith ?coCreator .
          ?s2 dblp-rdf:primaryFullPersonName ?name .
        }
      }`,
      nbResults: 3,
      testFun: function (b) {
        expect(b["s"]).to.deep.equal(
          createIRI("https://dblp.org/pers/m/Minier:Thomas")
        );
        expect(b["s2"]).to.deep.equal(
          createIRI("https://dblp.org/pers/g/Grall:Arnaud")
        );
        expect(b["name"]).to.deep.equal(createLiteral("Arnaud Grall"));
        expect(b["coCreator"]).to.be.deep.oneOf([
          createIRI("https://dblp.org/pers/m/Molli:Pascal"),
          createIRI("https://dblp.org/pers/m/Montoya:Gabriela"),
          createIRI("https://dblp.org/pers/s/Skaf=Molli:Hala"),
        ]);
      },
    },
  ];

  data.forEach((d) => {
    it(d.text, (t, done) => {
      let nbResults = 0;
      const iterator = engine.execute(d.query);
      iterator.subscribe(
        (bindings) => {
          assert(bindings instanceof BindingBase);
          const b = bindings.toObject();
          d.testFun(b);
          nbResults++;
        },
        done,
        () => {
          expect(nbResults).to.equal(d.nbResults);
          done();
        }
      );
    });
  });
});

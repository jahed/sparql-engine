// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { termToString } from "rdf-string";
import { BindingBase, type BindingsRecord } from "../../src/rdf/bindings.ts";
import {
  createIRI,
  createLangLiteral,
  createLiteral,
} from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("GRAPH/FROM queries", () => {
  const GRAPH_A_IRI = createIRI("http://example.org#some-graph-a");
  const GRAPH_B_IRI = createIRI("http://example.org#some-graph-b");
  let engine: TestEngine;
  beforeEach(() => {
    const gA = getGraph("./tests/data/dblp.nt");
    const gB = getGraph("./tests/data/dblp2.nt");
    engine = new TestEngine(gA, GRAPH_A_IRI);
    engine.addNamedGraph(GRAPH_B_IRI, gB);
  });

  const data: {
    text: string;
    query: string;
    nbResults: number;
    testFun: (b: BindingsRecord) => void;
  }[] = [
    {
      text: "should evaluate a query with one FROM clause",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?s ?name ?article
      FROM <${termToString(GRAPH_B_IRI)}>
      WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }`,
      nbResults: 2,
      testFun: function (b) {
        expect(b["s"]).to.deep.equal(
          createIRI("https://dblp.org/pers/g/Grall:Arnaud")
        );
        expect(b["name"]).to.deep.equal(createLiteral("Arnaud Grall"));
        expect(b["article"]).to.be.deep.oneOf([
          createIRI("https://dblp.org/rec/conf/semweb/GrallSM18"),
          createIRI("https://dblp.org/rec/conf/esws/GrallFMSMSV17"),
        ]);
      },
    },
    {
      text: "should evaluate a query with several FROM clauses",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT ?s ?name ?article
      FROM <${termToString(GRAPH_A_IRI)}>
      FROM <${termToString(GRAPH_B_IRI)}>
      WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?s dblp-rdf:authorOf ?article .
      }`,
      nbResults: 7,
      testFun: function (b) {
        switch (b["s"].value) {
          case "https://dblp.org/pers/g/Grall:Arnaud":
            expect(b["s"]).to.deep.equal(
              createIRI("https://dblp.org/pers/g/Grall:Arnaud")
            );
            expect(b["name"]).to.deep.equal(createLiteral("Arnaud Grall"));
            expect(b["article"]).to.be.deep.oneOf([
              createIRI("https://dblp.org/rec/conf/semweb/GrallSM18"),
              createIRI("https://dblp.org/rec/conf/esws/GrallFMSMSV17"),
            ]);
            break;
          case "https://dblp.org/pers/m/Minier:Thomas":
            expect(b["s"]).to.deep.equal(
              createIRI("https://dblp.org/pers/m/Minier:Thomas")
            );
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
            break;
          default:
            throw new Error(
              `Unexpected ?s binding found ${termToString(b["s"])}`
            );
        }
      },
    },
    {
      text: "should evaluate simple SPARQL GRAPH queries",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s dblp-rdf:coCreatorWith ?coCreator .
        GRAPH <${termToString(GRAPH_B_IRI)}> {
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
    {
      text: "should evaluate SPARQL GRAPH with FROM NAMED clauses",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT *
      FROM NAMED <${termToString(GRAPH_B_IRI)}>
      WHERE {
        ?s dblp-rdf:coCreatorWith ?coCreator .
        GRAPH ?g {
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
        expect(b["g"]).to.be.deep.oneOf([GRAPH_A_IRI, GRAPH_B_IRI]);
        expect(b["name"]).to.deep.equal(createLiteral("Arnaud Grall"));
        expect(b["coCreator"]).to.be.deep.oneOf([
          createIRI("https://dblp.org/pers/m/Molli:Pascal"),
          createIRI("https://dblp.org/pers/m/Montoya:Gabriela"),
          createIRI("https://dblp.org/pers/s/Skaf=Molli:Hala"),
        ]);
      },
    },
    {
      text: "should evaluate a query where the graph IRI is a SPARQL variable",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT *
      WHERE {
        ?s dblp-rdf:coCreatorWith ?coCreator .
        GRAPH ?g {
          ?s2 dblp-rdf:coCreatorWith ?coCreator .
          ?s2 dblp-rdf:primaryFullPersonName ?name .
        }
      }`,
      nbResults: 7,
      testFun: function (b) {
        expect(b["s"]).to.deep.equal(
          createIRI("https://dblp.org/pers/m/Minier:Thomas")
        );
        expect(b["g"]).to.be.deep.oneOf([GRAPH_A_IRI, GRAPH_B_IRI]);
        if (b["g"].equals(GRAPH_A_IRI)) {
          expect(b["s2"]).to.deep.equal(
            createIRI("https://dblp.org/pers/m/Minier:Thomas")
          );
          expect(b["name"]).to.deep.equal(
            createLangLiteral("Thomas Minier", "en")
          );
          expect(b["coCreator"]).to.be.deep.oneOf([
            createIRI("https://dblp.org/pers/m/Molli:Pascal"),
            createIRI("https://dblp.org/pers/m/Montoya:Gabriela"),
            createIRI("https://dblp.org/pers/s/Skaf=Molli:Hala"),
            createIRI("https://dblp.org/pers/v/Vidal:Maria=Esther"),
          ]);
        } else {
          expect(b["s2"]).to.deep.equal(
            createIRI("https://dblp.org/pers/g/Grall:Arnaud")
          );
          expect(b["name"]).to.deep.equal(createLiteral("Arnaud Grall"));
          expect(b["coCreator"]).to.be.deep.oneOf([
            createIRI("https://dblp.org/pers/m/Molli:Pascal"),
            createIRI("https://dblp.org/pers/m/Montoya:Gabriela"),
            createIRI("https://dblp.org/pers/s/Skaf=Molli:Hala"),
          ]);
        }
      },
    },
    {
      text: "should evaluate a SPARQL query where the graph IRI is bounded by another expression",
      query: `
      PREFIX dblp-pers: <https://dblp.org/pers/m/>
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      SELECT * WHERE {
        ?s dblp-rdf:coCreatorWith ?coCreator .
        BIND(<${termToString(GRAPH_B_IRI)}> as ?g)
        GRAPH ?g {
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
        expect(b["g"]).to.deep.equal(GRAPH_B_IRI);
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
        (b) => {
          assert.ok(b instanceof BindingBase);
          d.testFun(b.toObject());
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

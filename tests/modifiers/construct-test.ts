// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { createIRI, createLangLiteral } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("CONSTRUCT SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate simple CONSTRUCT queries", (t, done) => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    CONSTRUCT {
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }
    WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;
    let expectedArticles = [
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      createIRI("https://dblp.org/rec/conf/esws/MinierSMV18"),
      createIRI("https://dblp.org/rec/journals/corr/abs-1806-00227"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17"),
      createIRI("https://dblp.org/rec/conf/esws/MinierMSM17a"),
    ];
    const results = [];

    const iterator = engine.execute(query);
    iterator.subscribe(
      (triple) => {
        assert.ok(typeof triple === "object" && "subject" in triple);
        expect(triple.subject).to.deep.equal(
          createIRI("https://dblp.org/pers/m/Minier:Thomas")
        );
        expect(triple.predicate).to.be.deep.oneOf([
          createIRI(
            "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName"
          ),
          createIRI("https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf"),
        ]);
        if (
          triple.predicate.equals(
            createIRI(
              "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName"
            )
          )
        ) {
          expect(triple.object).to.deep.equal(
            createLangLiteral("Thomas Minier", "en")
          );
        } else {
          expect(triple.object).to.be.deep.oneOf(expectedArticles);
          expectedArticles = expectedArticles.filter(
            (a) => !triple.object.equals(a)
          );
        }
        results.push(triple);
      },
      done,
      () => {
        expect(results.length).to.equal(10);
        expect(expectedArticles.length).to.equal(0);
        done();
      }
    );
  });
});

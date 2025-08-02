// SPDX-License-Identifier: MIT
import { Bindings } from "@jahed/sparql-engine/rdf/bindings.ts";
import { RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { createGraph, TestEngine } from "../utils.ts";

describe("SPARQL VALUES", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluates VALUES clauses", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX esws: <https://dblp.org/rec/conf/esws/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?name ?article WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
      VALUES ?article { esws:MinierSMV18a esws:MinierMSM17 }
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("name", "article");
      expect(b["article"]).to.be.deep.oneOf([
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17"),
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      ]);
      results.push(b);
    }
    expect(results.length).to.equal(2);
  });

  it("should evaluates VALUES clauses mixed with Property Paths", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX esws: <https://dblp.org/rec/conf/esws/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    SELECT ?author ?article WHERE {
      ?author owl:sameAs/dblp-rdf:authorOf ?article .
      VALUES ?article { esws:MinierSMV18a esws:MinierMSM17 }
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("author", "article");
      expect(b["author"]).to.deep.equal(
        RDF.namedNode("https://dblp.uni-trier.de/pers/m/Minier:Thomas")
      );
      expect(b["article"]).to.be.deep.oneOf([
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierMSM17"),
        RDF.namedNode("https://dblp.org/rec/conf/esws/MinierSMV18a"),
      ]);
      results.push(b);
    }
    expect(results.length).to.equal(2);
  });
});

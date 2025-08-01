// SPDX-License-Identifier: MIT
import { getGraph, TestEngine } from "@jahed/sparql-engine-tests/utils.ts";
import { expect } from "chai";
import fs from "node:fs";
import { before, describe, it } from "node:test";
import jsonFormatter from "../src/index.ts";

describe("W3C JSON formatter", () => {
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
    for await (const b of engine.execute(query).pipe(jsonFormatter)) {
      results += b;
    }
    const json = JSON.parse(results);
    expect(json).to.deep.equals(
      JSON.parse(
        fs.readFileSync(
          new URL(import.meta.resolve("./select.json")).pathname,
          "utf-8"
        )
      )
    );
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
    for await (const b of engine.execute(query).pipe(jsonFormatter)) {
      results += b;
    }
    const json = JSON.parse(results);
    expect(json).to.deep.equals({
      boolean: true,
    });
  });
});

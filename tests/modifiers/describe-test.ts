// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine } from "../utils.ts";

describe("DESCRIBE SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate simple DESCRIBE queries", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    DESCRIBE ?s
    WHERE {
      ?s rdf:type dblp-rdf:Person .
    }`;
    const results = [];

    for await (const triple of engine.execute(query)) {
      assert.ok(typeof triple === "object" && "subject" in triple);
      expect(triple.subject).to.deep.equal(
        RDF.namedNode("https://dblp.org/pers/m/Minier:Thomas")
      );
      expect(triple.predicate).to.be.deep.oneOf([
        RDF.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        RDF.namedNode(
          "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName"
        ),
        RDF.namedNode(
          "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf"
        ),
        RDF.namedNode(
          "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith"
        ),
      ]);
      results.push(triple);
    }
    expect(results.length).to.equal(11);
  });
});

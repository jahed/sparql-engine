// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { beforeEach, describe, it } from "node:test";
import { stringToTerm } from "rdf-string";
import { createLangLiteral, dataFactory } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL UPDATE: INSERT/DELETE queries", () => {
  let engine: TestEngine<ReturnType<typeof getGraph>>;
  beforeEach(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate basic INSERT queries", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT { ?s dc:name  "Thomas Minier"@fr }
    WHERE {
      ?s rdf:type dblp-rdf:Person .
      ?s dblp-rdf:primaryFullPersonName ?name .
      ?s dblp-rdf:authorOf ?article .
    }`;

    for await (const b of engine.execute(query)) {
    }
    const triples = engine._graph._store.getTriples(
      "https://dblp.org/pers/m/Minier:Thomas",
      "http://purl.org/dc/elements/1.1/name",
      null
    );
    expect(triples.length).to.equal(1);
    expect(stringToTerm(triples[0].subject)).to.deep.equal(
      dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas")
    );
    expect(stringToTerm(triples[0].predicate)).to.deep.equal(
      dataFactory.namedNode("http://purl.org/dc/elements/1.1/name")
    );
    expect(stringToTerm(triples[0].object)).to.deep.equal(
      createLangLiteral("Thomas Minier", "fr")
    );
  });

  it("should evaluate basic DELETE queries", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    DELETE { ?s rdf:type dblp-rdf:Person . }
    WHERE {
      ?s rdf:type dblp-rdf:Person .
    }`;

    for await (const b of engine.execute(query)) {
    }
    const triples = engine._graph._store.getTriples(
      "https://dblp.org/pers/m/Minier:Thomas",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      null
    );
    expect(triples.length).to.equal(0);
  });

  it("should evaluate basic INSERT/DELETE queries", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT { ?s rdf:type rdf:Person . }
    WHERE { ?s rdf:type dblp-rdf:Person . } ;
    DELETE { ?s rdf:type dblp-rdf:Person . }
    WHERE { ?s rdf:type dblp-rdf:Person . }`;

    for await (const b of engine.execute(query)) {
    }
    const triples = engine._graph._store.getTriples(
      "https://dblp.org/pers/m/Minier:Thomas",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      null
    );
    expect(triples.length).to.equal(1);
    expect(stringToTerm(triples[0].subject)).to.deep.equal(
      dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas")
    );
    expect(stringToTerm(triples[0].predicate)).to.deep.equal(
      dataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    );
    expect(stringToTerm(triples[0].object)).to.deep.equal(
      dataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Person")
    );
  });

  it("should evaluate INSERT/DELETE queries where the WHERE evaluates to 0 solutions", async () => {
    const query = `
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    INSERT { ?s rdf:type rdf:Person . }
    WHERE { ?s rdf:type rdf:Person . } ;
    DELETE { ?s rdf:type dblp-rdf:Person . }
    WHERE { ?s rdf:type rdf:Person . }`;

    for await (const b of engine.execute(query)) {
    }
    const triples = engine._graph._store.getTriples(
      "https://dblp.org/pers/m/Minier:Thomas",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      null
    );
    expect(triples.length).to.equal(1);
    expect(stringToTerm(triples[0].subject)).to.deep.equal(
      dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas")
    );
    expect(stringToTerm(triples[0].predicate)).to.deep.equal(
      dataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    );
    expect(stringToTerm(triples[0].object)).to.deep.equal(
      dataFactory.namedNode(
        "https://dblp.uni-trier.de/rdf/schema-2017-04-18#Person"
      )
    );
  });
});

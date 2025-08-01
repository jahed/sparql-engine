// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings } from "../../src/rdf/bindings.ts";
import {
  createInteger,
  createLangLiteral,
  createLiteral,
  UNBOUND,
} from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL BIND", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate a simple BIND clause", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND ("Thomas Minier"@fr AS ?name)
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("s", "name");
      expect(b["name"]).to.deep.equal(createLangLiteral("Thomas Minier", "fr"));
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should evaluate BIND clauses with complex SPARQL expressions", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND (10 + 20 AS ?foo)
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("s", "foo");
      expect(b["foo"]).to.deep.equal(createInteger(30));
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should evaluate chained BIND clauses", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND ("Thomas Minier"@fr AS ?name)
      BIND (10 + 20 AS ?foo)
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("s", "name", "foo");
      expect(b["name"]).to.deep.equal(createLangLiteral("Thomas Minier", "fr"));
      expect(b["foo"]).to.deep.equal(createInteger(30));
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should evaluate a BIND clause with the COALESCE function", async () => {
    const query = `
    PREFIX dblp-pers: <https://dblp.org/pers/m/>
    PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
      ?s rdf:type dblp-rdf:Person .
      BIND(COALESCE(?s, "toto") AS ?s2)
      BIND(COALESCE(?x, "Thomas Minier") AS ?name)
      BIND(COALESCE(?x, ?y) AS ?undefined)
    }`;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("s", "s2", "name", "undefined");
      expect(b["s2"]).to.deep.equal(b["s"]);
      expect(b["name"]).to.deep.equal(createLiteral("Thomas Minier"));
      expect(b["undefined"]).to.deep.equal(UNBOUND);
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });
});

// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { termToString } from "rdf-string";
import type { BindingsRecord } from "../../src/rdf/bindings.ts";
import { Bindings } from "../../src/rdf/bindings.ts";
import { createInteger, RDF } from "../../src/utils/rdf.ts";
import { createGraph, TestEngine } from "../utils.ts";

describe("SPARQL aggregates", () => {
  let engine: TestEngine;

  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  it("should evaluate simple SPARQL queries with GROUP BY", async () => {
    const query = `
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("p", "nbPreds");
      switch (b["p"].value) {
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName":
        case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
          expect(b["nbPreds"]).to.deep.equal(createInteger(1));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf":
          expect(b["nbPreds"]).to.deep.equal(createInteger(5));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith":
          expect(b["nbPreds"]).to.deep.equal(createInteger(4));
          break;
        default:
          expect.fail(`Unexpected predicate found: ${termToString(b["p"])}`);
      }
      results.push(b);
    }
    expect(results.length).to.equal(4);
  });

  it("should evaluate queries with SPARQL expressions in GROUP BY", async () => {
    const query = `
    SELECT ?p ?z (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p (5 * 2 AS ?z)
    `;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("p", "nbPreds", "z");
      expect(b["z"]).to.deep.equal(createInteger(10));
      switch (b["p"].value) {
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName":
        case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
          expect(b["nbPreds"]).to.deep.equal(createInteger(1));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf":
          expect(b["nbPreds"]).to.deep.equal(createInteger(5));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith":
          expect(b["nbPreds"]).to.deep.equal(createInteger(4));
          break;
        default:
          expect.fail(`Unexpected predicate found: ${termToString(b["p"])}`);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(4);
  });

  it("should allow aggregate queries without a GROUP BY clause", async () => {
    const query = `
    SELECT (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }`;
    let nbResults = 0;

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("nbPreds");
      expect(b["nbPreds"]).to.deep.equal(createInteger(11));
      nbResults++;
    }
    expect(nbResults).to.equal(1);
  });

  it("should evaluate queries that mix aggregations and numeric operations", async () => {
    const query = `
    SELECT ?p (COUNT(?p) * 2 AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    `;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("p", "nbPreds");
      switch (b["p"].value) {
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName":
        case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
          expect(b["nbPreds"]).to.deep.equal(createInteger(2));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf":
          expect(b["nbPreds"]).to.deep.equal(createInteger(10));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith":
          expect(b["nbPreds"]).to.deep.equal(createInteger(8));
          break;
        default:
          expect.fail(`Unexpected predicate found: ${termToString(b["p"])}`);
          break;
      }
      results.push(b);
    }
    expect(results.length).to.equal(4);
  });

  it("should evaluate aggregates with HAVING clauses", async () => {
    const query = `
    SELECT ?p (COUNT(?p) AS ?nbPreds) WHERE {
      <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
    }
    GROUP BY ?p
    HAVING (COUNT(?p) > 1)
    `;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("p", "nbPreds");
      switch (b["p"].value) {
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf":
          expect(b["nbPreds"]).to.deep.equal(createInteger(5));
          break;
        case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith":
          expect(b["nbPreds"]).to.deep.equal(createInteger(4));
          break;
        default:
          throw new Error(
            `Unexpected predicate found: ${termToString(b["p"])}`
          );
      }
      results.push(b);
    }
    expect(results.length).to.equal(2);
  });

  it("should evaluate aggregation queries with non-compatible UNION clauses", async () => {
    const query = `
    SELECT ?s (COUNT(?s) AS ?nbSubjects) WHERE {
      { ?s a ?o1 . } UNION { ?s a ?o2}
    }
    GROUP BY ?s
    `;
    const results = [];

    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("s", "nbSubjects");
      expect(b["s"]).to.deep.equal(
        RDF.namedNode("https://dblp.org/pers/m/Minier:Thomas")
      );
      expect(b["nbSubjects"]).to.deep.equal(createInteger(2));
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  const data: {
    name: string;
    query: string;
    keys: string[];
    nbResults: number;
    testFun: (bindings: BindingsRecord) => void;
  }[] = [
    {
      name: "COUNT-DISTINCT",
      query: `
      SELECT (COUNT(DISTINCT ?p) as ?count) WHERE {
        ?s ?p ?o
      }
      `,
      keys: ["count"],
      nbResults: 1,
      testFun: function (b) {
        expect(b["count"]).to.deep.equal(createInteger(10));
      },
    },
    {
      name: "SUM",
      query: `
      SELECT ?p (SUM(?x) AS ?sum) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ["p", "sum"],
      nbResults: 4,
      testFun: function (b) {
        switch (b["p"].value) {
          case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName":
          case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
            expect(b["sum"]).to.deep.equal(createInteger(10));
            break;
          case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf":
            expect(b["sum"]).to.deep.equal(createInteger(50));
            break;
          case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith":
            expect(b["sum"]).to.deep.equal(createInteger(40));
            break;
          default:
            expect.fail(`Unexpected predicate found: ${b["sum"]}`);
            break;
        }
      },
    },
    {
      name: "AVG",
      query: `
      SELECT ?p (AVG(?x) AS ?avg) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ["p", "avg"],
      nbResults: 4,
      testFun: function (b) {
        expect(b["avg"]).to.deep.equal(createInteger(10));
      },
    },
    {
      name: "MIN",
      query: `
      SELECT ?p (MIN(?x) AS ?min) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ["p", "min"],
      nbResults: 4,
      testFun: function (b) {
        expect(b["min"]).to.deep.equal(createInteger(10));
      },
    },
    {
      name: "MAX",
      query: `
      SELECT ?p (MAX(?x) AS ?max) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ["p", "max"],
      nbResults: 4,
      testFun: function (b) {
        expect(b["max"]).to.deep.equal(createInteger(10));
      },
    },
    {
      name: "GROUP_CONCAT",
      query: `
      SELECT ?p (GROUP_CONCAT(?x; separator=".") AS ?concat) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ["p", "concat"],
      nbResults: 4,
      testFun: function (b) {
        switch (b["p"].value) {
          case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName":
          case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
            expect(b["concat"]).to.deep.equal(RDF.literal("10"));
            break;
          case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#authorOf":
            expect(b["concat"]).to.deep.equal(RDF.literal("10.10.10.10.10"));
            break;
          case "https://dblp.uni-trier.de/rdf/schema-2017-04-18#coCreatorWith":
            expect(b["concat"]).to.deep.equal(RDF.literal("10.10.10.10"));
            break;
          default:
            expect.fail(`Unexpected predicate found: ${b["concat"]}`);
            break;
        }
      },
    },
    {
      name: "SAMPLE",
      query: `
      SELECT ?p (SAMPLE(?x) AS ?sample) WHERE {
        <https://dblp.org/pers/m/Minier:Thomas> ?p ?o .
        BIND(10 AS ?x)
      }
      GROUP BY ?p`,
      keys: ["p", "sample"],
      nbResults: 4,
      testFun: function (b) {
        expect(b["sample"]).to.deep.equal(createInteger(10));
      },
    },
  ];

  data.forEach((d) => {
    it(`should evaluate the "${d.name}" aggregate`, async () => {
      const results = [];
      for await (const bindings of engine.execute(d.query)) {
        assert.ok(bindings instanceof Bindings);
        const b = bindings.toObject();
        expect(b).to.have.keys(...d.keys);
        d.testFun(b);
        results.push(b);
      }
      expect(results.length).to.equal(d.nbResults);
    });
  });
});

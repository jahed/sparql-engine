// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { Bindings, type BindingsRecord } from "../../src/rdf/bindings.ts";
import { createFloat } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("Non standard SPARQL aggregates", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  const data = [
    {
      name: "sea:accuracy",
      query: `
      PREFIX sea: <https://callidon.github.io/sparql-engine/aggregates#>
      SELECT (sea:accuracy(?x, ?y) AS ?acc) WHERE {
        { BIND(10 AS ?x) BIND(5 AS ?y) }
        UNION
        { BIND(10 AS ?x) BIND(10 AS ?y) }
      }
      GROUP BY ?x`,
      results: [
        {
          acc: createFloat(0.5),
        },
      ],
    },
    {
      name: "sea:gmean",
      query: `
      PREFIX sea: <https://callidon.github.io/sparql-engine/aggregates#>
      SELECT (sea:gmean(?x) AS ?gmean) WHERE {
        {
          { BIND(1 as ?g) BIND(4 AS ?x) }
          UNION
          { BIND(1 as ?g) BIND(1 AS ?x) }
        }
        UNION
        { BIND(1 as ?g) BIND(1/32 AS ?x) }
      }
      GROUP BY ?g`,
      results: [
        {
          gmean: createFloat(0.5),
        },
      ],
    },
    {
      name: "sea:rmse",
      query: `
      PREFIX sea: <https://callidon.github.io/sparql-engine/aggregates#>
      SELECT (sea:rmse(?x, ?y) AS ?mse) WHERE {
        { BIND(1 as ?g) BIND(10 AS ?x) BIND(5 AS ?y) }
        UNION
        { BIND(1 as ?g) BIND(5 AS ?x) BIND(8 AS ?y) }
      }
      GROUP BY ?g`,
      results: [
        {
          mse: createFloat(4.123105625617661),
        },
      ],
    },
  ];

  data.forEach((d) => {
    it(`should evaluate the "${d.name}" SPARQL aggregate`, (t, done) => {
      const results: BindingsRecord[] = [];
      const iterator = engine.execute(d.query);
      iterator.subscribe(
        (b) => {
          assert.ok(b instanceof Bindings);
          results.push(b.toObject());
        },
        done,
        () => {
          expect(results).to.deep.equals(d.results);
          done();
        }
      );
    });
  });
});

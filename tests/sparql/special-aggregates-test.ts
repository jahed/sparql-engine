// SPDX-License-Identifier: MIT
import {
  Bindings,
  type BindingsRecord,
} from "@jahed/sparql-engine/rdf/bindings.ts";
import { createFloat } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { createGraph, TestEngine } from "../utils.ts";

describe("Non standard SPARQL aggregates", () => {
  let engine: TestEngine;
  before(() => {
    const g = createGraph("./tests/data/dblp.nt");
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
    it(`should evaluate the "${d.name}" SPARQL aggregate`, async () => {
      const results: BindingsRecord[] = [];
      for await (const b of engine.execute(d.query)) {
        assert.ok(b instanceof Bindings);
        results.push(b.toObject());
      }
      expect(results).to.deep.equals(d.results);
    });
  });
});

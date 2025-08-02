// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import type { BindingsRecord } from "../../src/rdf/bindings.ts";
import { Bindings } from "../../src/rdf/bindings.ts";
import { createFloat, dataFactory } from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("Non standard SPARQL functions", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph("./tests/data/dblp.nt");
    engine = new TestEngine(g);
  });

  const data = [
    {
      name: "sef:cosh",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:cosh(1) AS ?x)
      }`,
      results: [
        {
          x: createFloat(1.5430806348152437),
        },
      ],
    },
    {
      name: "sef:sinh",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:sinh(1) AS ?x)
      }`,
      results: [
        {
          x: createFloat(1.1752011936438014),
        },
      ],
    },
    {
      name: "sef:tanh",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:tanh(1) AS ?x)
      }`,
      results: [
        {
          x: createFloat(0.7615941559557649),
        },
      ],
    },
    {
      name: "sef:coth",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:coth(1) AS ?x)
      }`,
      results: [
        {
          x: createFloat(1.3130352854993312),
        },
      ],
    },
    {
      name: "sef:sech",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:sech(1) AS ?x)
      }`,
      results: [
        {
          x: createFloat(0.6480542736638853),
        },
      ],
    },
    {
      name: "sef:csch",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?x WHERE {
        BIND(sef:csch(1) AS ?x)
      }`,
      results: [
        {
          x: createFloat(0.8509181282393214),
        },
      ],
    },
    {
      name: "sef:strsplit",
      query: `
      PREFIX sef: <https://callidon.github.io/sparql-engine/functions#>
      SELECT ?y WHERE {
        BIND("Thomas Minier" AS ?x)
        BIND(sef:strsplit(?x, " ") AS ?y)
      }`,
      results: [
        {
          y: dataFactory.literal("Thomas"),
        },
        {
          y: dataFactory.literal("Minier"),
        },
      ],
    },
  ];

  data.forEach((d) => {
    it(`should evaluate the "${d.name}" SPARQL function`, async () => {
      const results: BindingsRecord[] = [];
      for await (const b of engine.execute(d.query)) {
        assert.ok(b instanceof Bindings);
        results.push(b.toObject());
      }
      expect(results).to.deep.equals(d.results);
    });
  });
});

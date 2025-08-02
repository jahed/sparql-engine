// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { before, describe, it } from "node:test";
import { BindingBase, type BindingsRecord } from "../../src/rdf/bindings.ts";
import {
  createFloat,
  createInteger,
  createLangLiteral,
  dataFactory,
} from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("Full Text Search SPARQL queries", () => {
  let engine: TestEngine;
  before(() => {
    const g = getGraph(["./tests/data/dblp.nt", "./tests/data/dblp2.nt"]);
    engine = new TestEngine(g);
  });

  const data = [
    {
      description: "a simple full text search query",
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?name ses:search "Minier".
      }`,
      results: [
        {
          s: dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas"),
          name: createLangLiteral("Thomas Minier", "en"),
        },
      ],
    },
    {
      description: "a query with the ses:matchAllTerms parameter",
      query: `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?s WHERE {
        ?s rdfs:label ?label .
        ?label ses:search "RDF data Minier".
        ?label ses:matchAllTerms "true".
      }`,
      results: [
        {
          s: dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas.nt"),
        },
      ],
    },
    {
      description: "a query which includes the rank and the relevance score",
      query: `
      PREFIX dblp-rdf: <https://dblp.uni-trier.de/rdf/schema-2017-04-18#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT * WHERE {
        ?s rdf:type dblp-rdf:Person .
        ?s dblp-rdf:primaryFullPersonName ?name .
        ?name ses:search "Minier".
        ?name ses:relevance ?score .
        ?name ses:rank ?rank .
      }`,
      results: [
        {
          s: dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas"),
          name: createLangLiteral("Thomas Minier", "en"),
          score: createFloat(0.5),
          rank: createInteger(0),
        },
      ],
    },
    {
      description: "a query which a minimum relevance score",
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:minRelevance "1" .
      }`,
      results: [
        {
          o: dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas"),
          score: createFloat(1),
        },
      ],
    },
    {
      description: "a query which minimum and maximum relevance scores",
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:minRelevance "0.01" .
        ?o ses:maxRelevance "0.3" .
      }`,
      results: [
        {
          o: dataFactory.literal(
            "provenance information for RDF data of dblp person 'm/Minier:Thomas'"
          ),
          score: createFloat(0.111),
        },
      ],
    },
    {
      description: "a query which a maximum rank",
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score ?rank WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:maxRank "2" .
        ?o ses:rank ?rank
      }`,
      results: [
        {
          o: dataFactory.namedNode("https://dblp.org/pers/m/Minier:Thomas"),
          score: createFloat(1),
          rank: createInteger(0),
        },
        {
          o: createLangLiteral("Thomas Minier", "en"),
          score: createFloat(0.5),
          rank: createInteger(1),
        },
        {
          o: dataFactory.namedNode(
            "https://dblp.org/rec/conf/esws/MinierMSM17a"
          ),
          score: createFloat(0.5),
          rank: createInteger(2),
        },
      ],
    },
    {
      description: "a query which minimum and maximum ranks",
      query: `
      PREFIX ses: <https://callidon.github.io/sparql-engine/search#>
      SELECT ?o ?score ?rank WHERE {
        ?s ?p ?o .
        ?o ses:search "Thomas Minier".
        ?o ses:relevance ?score .
        ?o ses:minRank "1" .
        ?o ses:maxRank "2" .
        ?o ses:rank ?rank
      }`,
      results: [
        {
          o: createLangLiteral("Thomas Minier", "en"),
          score: createFloat(0.5),
          rank: createInteger(1),
        },
        {
          o: dataFactory.namedNode(
            "https://dblp.org/rec/conf/esws/MinierMSM17a"
          ),
          score: createFloat(0.5),
          rank: createInteger(2),
        },
      ],
    },
  ];

  data.forEach((d) => {
    it(`should evaluate ${d.description}`, async () => {
      const results: BindingsRecord[] = [];
      for await (const b of engine.execute(d.query)) {
        assert.ok(b instanceof BindingBase);
        results.push(b.toObject());
      }
      expect(results).to.deep.equals(d.results);
    });
  });
});

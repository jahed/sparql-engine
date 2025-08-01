// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { describe, it } from "node:test";
import type { CustomFunctions } from "../../src/operators/expressions/sparql-expression.ts";
import { Bindings } from "../../src/rdf/bindings.ts";
import {
  createBoolean,
  createLangLiteral,
  shallowCloneTerm,
  termToValue,
  UNBOUND,
} from "../../src/utils/rdf.ts";
import { getGraph, TestEngine } from "../utils.ts";

describe("SPARQL custom operators", () => {
  it("should allow for custom functions in BIND", async () => {
    const customFunctions: CustomFunctions = {
      "http://test.com#REVERSE": function (a) {
        assert.ok(a && !Array.isArray(a));
        return shallowCloneTerm(a, a.value.split("").reverse().join(""));
      },
    };

    const g = getGraph("./tests/data/dblp.nt");
    const engine = new TestEngine(g, undefined, customFunctions);

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?reversed
    WHERE
    {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName> ?thomas .
      BIND(test:REVERSE(?thomas) as ?reversed) .
    }
    `;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("reversed");
      expect(b["reversed"]).to.deep.equal(
        createLangLiteral("reiniM samohT", "en")
      );
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should allow for custom functions in FILTER", async () => {
    const customFunctions: CustomFunctions = {
      "http://test.com#CONTAINS_THOMAS": function (a) {
        assert.ok(a && !Array.isArray(a));
        return createBoolean(a.value.toLowerCase().indexOf("thomas") >= 0);
      },
    };
    const g = getGraph("./tests/data/dblp.nt");
    const engine = new TestEngine(g, undefined, customFunctions);

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?o
    WHERE
    {
      ?s ?p ?o . FILTER(test:CONTAINS_THOMAS(?o))
    }
    `;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("o");
      results.push(b);
    }
    expect(results.length).to.equal(3);
  });

  it("should allow for custom functions in HAVING", async () => {
    const customFunctions: CustomFunctions = {
      "http://test.com#IS_EVEN": function (a) {
        assert.ok(a && "datatype" in a);
        const value = termToValue<number>(a);
        return createBoolean(value % 2 === 0);
      },
    };
    const g = getGraph("./tests/data/dblp.nt");
    const engine = new TestEngine(g, undefined, customFunctions);

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?length
    WHERE
    {
      ?s ?p ?o .
      BIND (STRLEN(?o) as ?length)
    }
    GROUP BY ?length
    HAVING (test:IS_EVEN(?length))
    `;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("length");
      const length = termToValue<number>(b["length"]);
      expect(length % 2).to.equal(0);
      results.push(b);
    }
    expect(results.length).to.equal(8);
  });

  it('should consider the solution "unbound" on an error, but query should continue continue', async () => {
    const customFunctions: CustomFunctions = {
      "http://test.com#ERROR": function (a) {
        throw new Error(
          "This should result in an unbould solution, but the query should still evaluate"
        );
      },
    };

    const g = getGraph("./tests/data/dblp.nt");
    const engine = new TestEngine(g, undefined, customFunctions);

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?error
    WHERE
    {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName> ?thomas .
      BIND(test:ERROR(?thomas) as ?error) .
    }
    `;
    const results = [];
    for await (const bindings of engine.execute(query)) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.keys("error");
      expect(b["error"]).to.deep.equal(UNBOUND);
      results.push(b);
    }
    expect(results.length).to.equal(1);
  });

  it("should fail if the custom function does not exist", async () => {
    const g = getGraph("./tests/data/dblp.nt");
    const engine = new TestEngine(g);

    const query = `
    PREFIX test: <http://test.com#>
    SELECT ?reversed
    WHERE
    {
      <https://dblp.org/pers/m/Minier:Thomas> <https://dblp.uni-trier.de/rdf/schema-2017-04-18#primaryFullPersonName> ?thomas .
      BIND(test:REVERSE(?thomas) as ?reversed) .
    }
    `;
    expect(() => engine.execute(query)).to.throw(Error);
  });
});

// SPDX-License-Identifier: MIT
import { expect } from "chai";
import assert from "node:assert";
import { describe, it } from "node:test";
import { from } from "rxjs";
import type { OperationExpression } from "sparqljs";
import bind from "../../src/operators/bind.ts";
import { BindingBase, Bindings } from "../../src/rdf/bindings.ts";
import { createInteger, dataFactory } from "../../src/utils/rdf.ts";

describe("Bind operator", () => {
  it("should bind results of valid SPARQL expression to a variable", async () => {
    let nbResults = 0;
    const source = from([
      BindingBase.fromObject({
        x: createInteger(1),
        y: createInteger(2),
      }),
      BindingBase.fromObject({
        x: createInteger(2),
        y: createInteger(3),
      }),
    ]);
    const expr: OperationExpression = {
      type: "operation",
      operator: "+",
      args: [dataFactory.variable("x"), dataFactory.variable("y")],
    };
    for await (const bindings of bind(
      source,
      dataFactory.variable("z"),
      expr
    )) {
      assert.ok(bindings instanceof Bindings);
      const b = bindings.toObject();
      expect(b).to.have.all.keys("x", "y", "z");
      if (b["x"].value === "1") {
        expect(b["z"]).to.deep.equal(createInteger(3));
      } else {
        expect(b["z"]).to.deep.equal(createInteger(5));
      }
      nbResults++;
    }
    expect(nbResults).to.equal(2);
  });
});

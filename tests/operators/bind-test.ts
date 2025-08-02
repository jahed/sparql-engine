// SPDX-License-Identifier: MIT
import bind from "@jahed/sparql-engine/operators/bind.ts";
import { BindingBase, Bindings } from "@jahed/sparql-engine/rdf/bindings.ts";
import { createInteger, RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import assert from "node:assert";
import { describe, it } from "node:test";
import { from } from "rxjs";
import type { OperationExpression } from "sparqljs";

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
      args: [RDF.variable("x"), RDF.variable("y")],
    };
    for await (const bindings of bind(source, RDF.variable("z"), expr)) {
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

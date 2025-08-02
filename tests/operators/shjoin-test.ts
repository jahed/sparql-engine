// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { describe, it } from "node:test";
import { from } from "rxjs";
import symHashJoin from "../../src/operators/join/shjoin.ts";
import { BindingBase } from "../../src/rdf/bindings.ts";
import { dataFactory } from "../../src/utils/rdf.ts";

describe("Symmetric Hash Join operator", () => {
  it("should perform a join between two sources of bindings", async () => {
    const toto = dataFactory.namedNode("http://example.org#toto");
    const titi = dataFactory.namedNode("http://example.org#titi");
    const tata = dataFactory.namedNode("http://example.org#tata");

    let nbResults = 0;
    let nbEach = new Map();
    nbEach.set(toto, 0);
    nbEach.set(titi, 0);
    nbEach.set(tata, 0);
    const left = from([
      BindingBase.fromObject({ x: toto }),
      BindingBase.fromObject({ x: titi }),
    ]);
    const right = from([
      BindingBase.fromObject({
        x: toto,
        y: dataFactory.literal("1"),
      }),
      BindingBase.fromObject({
        x: toto,
        y: dataFactory.literal("2"),
      }),
      BindingBase.fromObject({
        x: toto,
        y: dataFactory.literal("3"),
      }),
      BindingBase.fromObject({
        x: titi,
        y: dataFactory.literal("4"),
      }),
      BindingBase.fromObject({
        x: tata,
        y: dataFactory.literal("5"),
      }),
    ]);

    for await (const value of symHashJoin("x", left, right)) {
      const b = value.toObject();
      expect(b).to.have.all.keys("x", "y");
      nbResults++;

      if (b["x"].equals(toto)) {
        expect(b["y"]).to.be.deep.oneOf([
          dataFactory.literal("1"),
          dataFactory.literal("2"),
          dataFactory.literal("3"),
        ]);
        nbEach.set(toto, nbEach.get(toto) + 1);
        return;
      }

      if (b["x"].equals(titi)) {
        expect(b["y"]).to.be.deep.oneOf([dataFactory.literal("4")]);
        nbEach.set(titi, nbEach.get(titi) + 1);
        return;
      }

      throw new Error(`Unexpected "x" value: ${b["x"]}`);
    }
    expect(nbResults).to.equal(4);
    expect(nbEach.get(toto)).to.equal(3);
    expect(nbEach.get(titi)).to.equal(1);
  });
});

// SPDX-License-Identifier: MIT
"use strict";

import { expect } from "chai";
import { describe, it } from "node:test";
import { from } from "rxjs";
import { BindingBase } from "../../src/index.ts";
import hashJoin from "../../src/operators/join/hash-join.ts";
import { createIRI, createLiteral } from "../../src/utils/rdf.ts";

describe("Hash Join operator", () => {
  it("should perform a join between two sources of bindings", (t, done) => {
    const toto = createIRI("http://example.org#toto");
    const titi = createIRI("http://example.org#titi");
    const tata = createIRI("http://example.org#tata");

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
        y: createLiteral("1"),
      }),
      BindingBase.fromObject({
        x: toto,
        y: createLiteral("2"),
      }),
      BindingBase.fromObject({
        x: toto,
        y: createLiteral("3"),
      }),
      BindingBase.fromObject({
        x: titi,
        y: createLiteral("4"),
      }),
      BindingBase.fromObject({
        x: tata,
        y: createLiteral("5"),
      }),
    ]);

    const op = hashJoin(left, right, "x");
    op.subscribe(
      (value) => {
        const b = value.toObject();
        expect(b).to.have.all.keys("x", "y");
        nbResults++;

        if (b["x"].equals(toto)) {
          expect(b["y"]).to.be.deep.oneOf([
            createLiteral("1"),
            createLiteral("2"),
            createLiteral("3"),
          ]);
          nbEach.set(toto, nbEach.get(toto) + 1);
          return;
        }

        if (b["x"].equals(titi)) {
          expect(value.get("y")).to.be.deep.oneOf([createLiteral("4")]);
          nbEach.set(titi, nbEach.get(titi) + 1);
          return;
        }

        throw new Error(`Unexpected "x" value: ${b["x"]}`);
      },
      done,
      () => {
        expect(nbResults).to.equal(4);
        expect(nbEach.get(toto)).to.equal(3);
        expect(nbEach.get(titi)).to.equal(1);
        done();
      }
    );
  });
});

// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { describe, it } from "node:test";
import type { BgpPattern, Pattern, SelectQuery, UnionPattern } from "sparqljs";
import UnionMerge from "../../src/optimizer/visitors/union-merge.ts";
import {
  createIRI,
  createLangLiteral,
  dataFactory,
} from "../../src/utils/rdf.ts";

describe("Union merge optimization", () => {
  it("should merge several unions into a single top-level union", () => {
    const query = (...where: Pattern[]): SelectQuery => {
      return {
        type: "query",
        prefixes: {},
        queryType: "SELECT",
        variables: [],
        where,
      };
    };
    const union = (...patterns: Pattern[]): UnionPattern => {
      return { type: "union", patterns };
    };
    const placeholder = (s: string): BgpPattern => {
      return {
        type: "bgp",
        triples: [
          dataFactory.quad(
            dataFactory.variable(s),
            createIRI("http://example.org#foo"),
            createLangLiteral("food", "en")
          ),
        ],
      };
    };

    const rule = new UnionMerge();
    const plan = query(
      union(union(placeholder("s1")), union(placeholder("s2")))
    );
    const res = rule.visit(plan);
    expect(res).to.deep.equal(
      query(union(placeholder("s1"), placeholder("s2")))
    );
  });
});

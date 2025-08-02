// SPDX-License-Identifier: MIT
import UnionMerge from "@jahed/sparql-engine/optimizer/visitors/union-merge.ts";
import { createLangLiteral, RDF } from "@jahed/sparql-engine/utils/rdf.ts";
import { expect } from "chai";
import { describe, it } from "node:test";
import type { BgpPattern, Pattern, SelectQuery, UnionPattern } from "sparqljs";

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
          RDF.quad(
            RDF.variable(s),
            RDF.namedNode("http://example.org#foo"),
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

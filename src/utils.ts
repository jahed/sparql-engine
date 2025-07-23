/* file : utils.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import type { Algebra } from "sparqljs";
import type { PipelineStage } from "./engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "./engine/pipeline/pipeline.ts";
import { Bindings } from "./rdf/bindings.ts";

/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param triple  - Triple pattern
 * @param bindings - Set of bindings
 * @return An new, bounded triple pattern
 */
export function applyBindings(
  triple: Algebra.TripleObject,
  bindings: Bindings
): Algebra.TripleObject {
  const newTriple = Object.assign({}, triple);
  if (triple.subject.startsWith("?") && bindings.has(triple.subject)) {
    newTriple.subject = bindings.get(triple.subject)!;
  }
  if (triple.predicate.startsWith("?") && bindings.has(triple.predicate)) {
    newTriple.predicate = bindings.get(triple.predicate)!;
  }
  if (triple.object.startsWith("?") && bindings.has(triple.object)) {
    newTriple.object = bindings.get(triple.object)!;
  }
  return newTriple;
}

/**
 * Recursively apply bindings to every triple in a SPARQL group pattern
 * @param  group - SPARQL group pattern to process
 * @param  bindings - Set of bindings to use
 * @return A new SPARQL group pattern with triples bounded
 */
export function deepApplyBindings(
  group: Algebra.PlanNode,
  bindings: Bindings
): Algebra.PlanNode {
  switch (group.type) {
    case "bgp":
      // WARNING property paths are not supported here
      const triples = (group as Algebra.BGPNode)
        .triples as Algebra.TripleObject[];
      const bgp: Algebra.BGPNode = {
        type: "bgp",
        triples: triples.map((t) => bindings.bound(t)),
      };
      return bgp;
    case "group":
    case "optional":
    case "service":
    case "union":
      const newGroup: Algebra.GroupNode = {
        type: group.type,
        patterns: (group as Algebra.GroupNode).patterns.map((g) =>
          deepApplyBindings(g, bindings)
        ),
      };
      return newGroup;
    case "query":
      let subQuery: Algebra.RootNode = group as Algebra.RootNode;
      subQuery.where = subQuery.where.map((g) =>
        deepApplyBindings(g, bindings)
      );
      return subQuery;
    default:
      return group;
  }
}

/**
 * Extends all set of bindings produced by an iterator with another set of bindings
 * @param  source - Source {@link PipelineStage}
 * @param  bindings - Bindings added to each set of bindings procuded by the iterator
 * @return A {@link PipelineStage} that extends bindins produced by the source iterator
 */
export function extendByBindings(
  source: PipelineStage<Bindings>,
  bindings: Bindings
): PipelineStage<Bindings> {
  return Pipeline.getInstance().map(source, (b: Bindings) => bindings.union(b));
}

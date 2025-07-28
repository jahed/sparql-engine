// SPDX-License-Identifier: MIT
"use strict";

import type { BgpPattern, BlockPattern, Pattern, Query } from "sparqljs";
import type { PipelineStage } from "./engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "./engine/pipeline/pipeline.ts";
import { Bindings } from "./rdf/bindings.ts";
import type { EnginePredicate, EngineSubject, EngineTriple } from "./types.ts";
import { isVariable, tripleToQuad } from "./utils/rdf.ts";

/**
 * Bound a triple pattern using a set of bindings, i.e., substitute variables in the triple pattern
 * using the set of bindings provided
 * @param triple  - Triple pattern
 * @param bindings - Set of bindings
 * @return An new, bounded triple pattern
 */
export function applyBindings(
  triple: EngineTriple,
  bindings: Bindings
): EngineTriple {
  const newTriple = Object.assign({}, triple);
  if (isVariable(triple.subject) && bindings.has(triple.subject.value)) {
    newTriple.subject = bindings.get(triple.subject.value) as EngineSubject;
  }
  if (isVariable(triple.predicate) && bindings.has(triple.predicate.value)) {
    newTriple.predicate = bindings.get(
      triple.predicate.value
    ) as EnginePredicate;
  }
  if (isVariable(triple.object) && bindings.has(triple.object.value)) {
    newTriple.object = bindings.get(triple.object.value)!;
  }
  return newTriple;
}

/**
 * Recursively apply bindings to every triple in a SPARQL group pattern
 * @param  group - SPARQL group pattern to process
 * @param  bindings - Set of bindings to use
 * @return A new SPARQL group pattern with triples bounded
 */
export function deepApplyBindings(group: Pattern, bindings: Bindings): Pattern {
  switch (group.type) {
    case "bgp":
      // WARNING property paths are not supported here
      const bgp: BgpPattern = {
        type: "bgp",
        triples: group.triples.map((t) => bindings.bound(tripleToQuad(t))),
      };
      return bgp;
    case "group":
    case "optional":
    case "service":
    case "union":
      return {
        type: group.type,
        patterns: group.patterns.map((g) => deepApplyBindings(g, bindings)),
      } as BlockPattern;
    case "query":
      let subQuery: Query = group;
      subQuery.where = subQuery.where?.map((g) =>
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

"use strict";

import type { Algebra } from "sparqljs";
import type { BGPCache } from "../engine/cache/bgp-cache.ts";
import ExecutionContext from "../engine/context/execution-context.ts";
import ContextSymbols from "../engine/context/symbols.ts";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import BGPStageBuilder from "../engine/stages/bgp-stage-builder.ts";
import { Bindings } from "../rdf/bindings.ts";
import Graph from "../rdf/graph.ts";

/**
 * Evaluate a Basic Graph pattern on a RDF graph using a cache
 * @param bgp - Basic Graph pattern to evaluate
 * @param graph - RDF graph
 * @param cache - Cache used
 * @return A pipeline stage that produces the evaluation results
 */
export function cacheEvalBGP(
  patterns: Algebra.TripleObject[],
  graph: Graph,
  cache: BGPCache,
  builder: BGPStageBuilder,
  context: ExecutionContext
): PipelineStage<Bindings> {
  const bgp = {
    patterns,
    graphIRI: graph.iri,
  };
  const [subsetBGP, missingBGP] = cache.findSubset(bgp);
  // case 1: no subset of the BGP are in cache => classic evaluation (most frequent)
  if (subsetBGP.length === 0) {
    // we cannot cache the BGP if the query has a LIMIT and/or OFFSET modiifier
    // otherwise we will cache incomplete results. So, we just evaluate the BGP
    if (
      context.hasProperty(ContextSymbols.HAS_LIMIT_OFFSET) &&
      context.getProperty(ContextSymbols.HAS_LIMIT_OFFSET)
    ) {
      return graph.evalBGP(patterns, context);
    }
    // generate an unique writer ID
    const writerID = crypto.randomUUID();
    // evaluate the BGP while saving all solutions into the cache
    const iterator = Pipeline.getInstance().tap(
      graph.evalBGP(patterns, context),
      (b) => {
        cache.update(bgp, b, writerID);
      }
    );
    // commit the cache entry when the BGP evaluation is done
    return Pipeline.getInstance().finalize(iterator, () => {
      cache.commit(bgp, writerID);
    });
  }
  // case 2: no missing patterns => the complete BGP is in the cache
  if (missingBGP.length === 0) {
    return cache.getAsPipeline(bgp, () => graph.evalBGP(patterns, context));
  }
  const cachedBGP = {
    patterns: subsetBGP,
    graphIRI: graph.iri,
  };
  // case 3: evaluate the subset BGP using the cache, then join with the missing patterns
  const iterator = cache.getAsPipeline(cachedBGP, () =>
    graph.evalBGP(subsetBGP, context)
  );
  return builder.execute(iterator, missingBGP, context);
}

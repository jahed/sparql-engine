// SPDX-License-Identifier: MIT
"use strict";

import ExecutionContext from "../../engine/context/execution-context.ts";
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import BGPStageBuilder from "../../engine/stages/bgp-stage-builder.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import Graph from "../../rdf/graph.ts";
import type { EngineTriple } from "../../types.ts";
import { cacheEvalBGP } from "../../utils/evaluation.ts";

/**
 * Find a rewriting key in a list of variables
 * For example, in [ ?s, ?o_1 ], the rewriting key is 1
 * @private
 */
function findKey(
  variables: IterableIterator<string>,
  maxValue: number = 15
): number {
  let key = -1;
  for (let v of variables) {
    for (let i = 0; i < maxValue; i++) {
      if (v.endsWith(`_${i}`)) {
        return i;
      }
    }
  }
  return key;
}

/**
 * Undo the bound join rewriting on solutions bindings, e.g., rewrite all variables "?o_1" to "?o"
 * @private
 */
function revertBinding(
  key: number,
  input: Bindings,
  variables: IterableIterator<string>
): Bindings {
  const newBinding = input.empty();
  for (let vName of variables) {
    let suffix = `_${key}`;
    if (vName.endsWith(suffix)) {
      const index = vName.indexOf(suffix);
      newBinding.set(vName.substring(0, index), input.get(vName)!);
    } else {
      newBinding.set(vName, input.get(vName)!);
    }
  }
  return newBinding;
}

/**
 * Undo the rewriting on solutions bindings, and then merge each of them with the corresponding input binding
 * @private
 */
function rewriteSolutions(
  bindings: Bindings,
  rewritingMap: Map<number, Bindings>
): Bindings {
  const key = findKey(bindings.variables());
  // rewrite binding, and then merge it with the corresponding one in the bucket
  let newBinding = revertBinding(key, bindings, bindings.variables());
  if (rewritingMap.has(key)) {
    newBinding = newBinding.union(rewritingMap.get(key)!);
  }
  return newBinding;
}

/**
 * A special operator used to evaluate a UNION query with a RDF Graph,
 * and then rewrite bindings generated and performs union with original bindings.
 * It is designed to be used in the bound join algorithm
 * @private
 * @param  graph - Graph queried
 * @param  bgpBucket - List of BGPs to evaluate
 * @param  rewritingTable - Map <rewriting key -> original bindings>
 * @param  context - Query execution context
 * @return A pipeline stage which evaluates the query.
 */
export default function rewritingOp(
  graph: Graph,
  bgpBucket: EngineTriple[][],
  rewritingTable: Map<number, Bindings>,
  builder: BGPStageBuilder,
  context: ExecutionContext
) {
  let source;
  if (context.cachingEnabled()) {
    // partition the BGPs that can be evaluated using the cache from the others
    const stages: PipelineStage<Bindings>[] = [];
    const others: EngineTriple[][] = [];
    bgpBucket.forEach((patterns) => {
      if (context.cache!.has({ patterns, graphIRI: graph.iri })) {
        stages.push(
          cacheEvalBGP(patterns, graph, context.cache!, builder, context)
        );
      } else {
        others.push(patterns);
      }
    });
    // merge all sources from the cache first, and then the evaluation of bgp that are not in the cache
    source = Pipeline.getInstance().merge(
      Pipeline.getInstance().merge(...stages),
      graph.evalUnion(others, context)
    );
  } else {
    source = graph.evalUnion(bgpBucket, context);
  }
  return Pipeline.getInstance().map(source, (bindings) =>
    rewriteSolutions(bindings, rewritingTable)
  );
}

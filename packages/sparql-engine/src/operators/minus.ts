// SPDX-License-Identifier: MIT
import { concat, intersection } from "lodash-es";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import { Bindings } from "../rdf/bindings.ts";

/**
 * Evaluates a SPARQL MINUS clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#neg-minus}
 * @param leftSource - Left input {@link PipelineStage}
 * @param rightSource - Right input {@link PipelineStage}
 * @return A {@link PipelineStage} which evaluate the MINUS operation
 */
export default function minus(
  leftSource: PipelineStage<Bindings>,
  rightSource: PipelineStage<Bindings>
) {
  // first materialize the right source in a buffer, then apply difference on the left source
  const engine = Pipeline.getInstance();
  let op = engine.reduce(
    rightSource,
    (acc: Bindings[], b: Bindings) => concat(acc, b),
    []
  );
  return engine.mergeMap(op, (buffer: Bindings[]) => {
    return engine.filter(leftSource, (bindings: Bindings) => {
      const leftKeys = Array.from(bindings.variables());
      // mu_a is compatible with mu_b if,
      // for all v in intersection(dom(mu_a), dom(mu_b)), mu_a[v] = mu_b[v]
      const isCompatible = buffer.some((b: Bindings) => {
        const rightKeys = Array.from(b.variables());
        const commonKeys = intersection(leftKeys, rightKeys);
        return commonKeys.every((k: string) => {
          return b.get(k)?.equals(bindings.get(k));
        });
      });
      // only output non-compatible bindings
      return !isCompatible;
    });
  });
}

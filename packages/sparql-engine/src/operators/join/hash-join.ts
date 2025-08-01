// SPDX-License-Identifier: MIT
import { termToString } from "rdf-string";
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import HashJoinTable from "./hash-join-table.ts";

/**
 * Perform a traditional Hash join between two sources, i.e., materialize the right source in a hash table and then read from the left source while probing into the hash table.
 * @param  left - Left source (a {@link PipelineStage})
 * @param  right - Right source (a {@link PipelineStage})
 * @param  joinKey - SPARQL variable used as join attribute
 * @return A {@link PipelineStage} which performs a Hash join
 */
export default function hashJoin(
  left: PipelineStage<Bindings>,
  right: PipelineStage<Bindings>,
  joinKey: string
) {
  const joinTable = new HashJoinTable();
  const engine = Pipeline.getInstance();
  return engine.mergeMap(engine.collect(right), (values: Bindings[]) => {
    // materialize right relation into the hash table
    values.forEach((bindings) => {
      if (bindings.has(joinKey)) {
        joinTable.put(termToString(bindings.get(joinKey)!), bindings);
      }
    });
    // read from left and probe each value into the hash table
    return engine.mergeMap(left, (bindings: Bindings) => {
      return engine.from(
        joinTable.join(termToString(bindings.get(joinKey)!), bindings)
      );
    });
  });
}

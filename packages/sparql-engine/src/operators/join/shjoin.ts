// SPDX-License-Identifier: MIT
import { termToString } from "rdf-string";
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import HashJoinTable from "./hash-join-table.ts";

/**
 * Utility function used to perform one half of a symmetric hash join
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  source  - Source of bindings (a {@link PipelineStage})
 * @param  innerTable - Hash table in which bindings are inserted
 * @param  outerTable - Hash table in which bindings are probed
 * @return A {@link PipelineStage} that performs one half of a symmetric hash join
 */
function halfHashJoin(
  joinKey: string,
  source: PipelineStage<Bindings>,
  innerTable: HashJoinTable,
  outerTable: HashJoinTable
): PipelineStage<Bindings> {
  const engine = Pipeline.getInstance();
  return engine.mergeMap(source, (bindings: Bindings) => {
    if (!bindings.has(joinKey)) {
      return engine.empty<Bindings>();
    }
    const key = termToString(bindings.get(joinKey)!);

    // insert into inner table
    innerTable.put(key, bindings);

    // probe into outer table
    return engine.from(outerTable.join(key, bindings));
  });
}

/**
 * Perform a Symmetric Hash Join between two sources
 * @param  joinKey - SPARQL variable used as join attribute
 * @param  left - Left source (a {@link PipelineStage})
 * @param  right - Right source (a {@link PipelineStage})
 * @return A {@link PipelineStage} that performs a symmetric hash join between the sources
 */
export default function symHashJoin(
  joinKey: string,
  left: PipelineStage<Bindings>,
  right: PipelineStage<Bindings>
) {
  const leftTable = new HashJoinTable();
  const rightTable = new HashJoinTable();
  const leftOp = halfHashJoin(joinKey, left, leftTable, rightTable);
  const rightOp = halfHashJoin(joinKey, right, rightTable, leftTable);
  return Pipeline.getInstance().merge(leftOp, rightOp);
}

// SPDX-License-Identifier: MIT
import type { Query, Variable } from "sparqljs";
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import { isWildcard, UNBOUND } from "../../utils/rdf.ts";

/**
 * Evaluates a SPARQL SELECT operation, i.e., perform a selection over sets of solutions bindings
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#select}
 * @param source - Input {@link PipelineStage}
 * @param query - SELECT query
 * @return A {@link PipelineStage} which evaluate the SELECT modifier
 */
export default function select(source: PipelineStage<Bindings>, query: Query) {
  if (!("variables" in query)) {
    throw new Error("Not a select query.");
  }
  if (isWildcard(query.variables[0])) {
    return Pipeline.getInstance().map(source, (bindings: Bindings) => {
      // return bindings.mapValues((k, v) => (rdf.isVariable(k) ? v : null));
      return bindings;
    });
  }
  const variables = (query.variables as Variable[]).map((v) =>
    "variable" in v ? v.variable : v
  );
  return Pipeline.getInstance().map(source, (bindings: Bindings) => {
    bindings = variables.reduce((obj, v) => {
      if (bindings.has(v.value)) {
        obj.set(v.value, bindings.get(v.value)!);
      } else {
        obj.set(v.value, UNBOUND);
      }
      return obj;
    }, bindings.empty());
    // return bindings.mapValues((k, v) => (rdf.isVariable(k) ? v : null));
    return bindings;
  });
}

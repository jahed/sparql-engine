// SPDX-License-Identifier: MIT
"use strict";

import { sortedIndexOf } from "lodash-es";
import { termToString } from "rdf-string";
import type { VariableTerm } from "sparqljs";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import { Bindings } from "../rdf/bindings.ts";
import type { EngineTripleValue } from "../types.ts";
import { UNBOUND } from "../utils/rdf.ts";

/**
 * Hash functions for set of bindings
 * @private
 * @param  variables - SPARQL variables to hash
 * @param  bindings  - Set of bindings to hash
 * @return Hashed set of bindings
 */
function _hashBindings(variables: string[], bindings: Bindings): string {
  // if no GROUP BY variables are used (in the case of an empty GROUP BY)
  // then we use a default grouping key
  if (variables.length === 0) {
    return "http://callidon.github.io/sparql-engine#DefaultGroupKey";
  }
  return variables
    .map((v) => termToString(bindings.get(v) ?? UNBOUND))
    .join(";");
}

export type Group = Record<string, EngineTripleValue[]>;

/**
 * Apply a SPARQL GROUP BY clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#groupby}
 * @param source - Input {@link PipelineStage}
 * @param variables - GROUP BY variables
 * @return A {@link PipelineStage} which evaluate the GROUP BY operation
 */
export default function sparqlGroupBy(
  source: PipelineStage<Bindings>,
  variables: VariableTerm[]
): PipelineStage<Bindings> {
  const groups: Map<string, Group> = new Map();
  const keys: Map<string, Bindings> = new Map();
  const engine = Pipeline.getInstance();
  const groupVariables = variables.map((v) => v.value).sort();
  let op = engine.map(source, (bindings: Bindings) => {
    const key = _hashBindings(groupVariables, bindings);
    // create a new group is needed
    if (!groups.has(key)) {
      keys.set(
        key,
        bindings.filter(
          (variable) => sortedIndexOf(groupVariables, variable) > -1
        )
      );
      groups.set(key, {});
    }
    // parse each binding in the intermediate format used by SPARQL expressions
    // and insert it into the corresponding group
    bindings.forEach((variable, value) => {
      const group = groups.get(key)!;
      if (variable in group) {
        group[variable].push(value);
      } else {
        group[variable] = [value];
      }
    });
    return null;
  });
  return engine.mergeMap(engine.collect(op), () => {
    const aggregates: Bindings[] = [];
    // transform each group in a set of bindings
    groups.forEach((group, key) => {
      // also add the GROUP BY keys to the set of bindings
      const b = keys.get(key)!.clone();
      b.setProperty("__aggregate", group);
      aggregates.push(b);
    });
    return engine.from(aggregates);
  });
}

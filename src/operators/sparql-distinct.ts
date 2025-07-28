// SPDX-License-Identifier: MIT
"use strict";

import { termToString } from "rdf-string";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import { Bindings } from "../rdf/bindings.ts";

/**
 * Hash an set of mappings and produce an unique value
 * @private
 * @param item - The item to hash
 * @return An unique hash which identify the item
 */
function _hash(bindings: Bindings): string {
  const items: string[] = [];
  bindings.forEach((k, v) =>
    items.push(`${k}=${encodeURIComponent(termToString(v))}`)
  );
  items.sort();
  return items.join("&");
}

/**
 * Applies a DISTINCT modifier on the output of another operator.
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modDuplicates}
 * @param source - Input {@link PipelineStage}
 * @return A {@link PipelineStage} which evaluate the DISTINCT operation
 */
export default function sparqlDistinct(source: PipelineStage<Bindings>) {
  return Pipeline.getInstance().distinct(source, (bindings: Bindings) =>
    _hash(bindings)
  );
}

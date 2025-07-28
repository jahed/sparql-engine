// SPDX-License-Identifier: MIT
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import { BindingBase, Bindings } from "../../rdf/bindings.ts";

/**
 * A AskOperator output True if a source iterator has solutions, false otherwise.
 * results are outputed following the SPARQL XML results format
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#ask}
 * @param source - Source {@link PipelineStage}
 * @return A {@link PipelineStage} that evaluate the ASK modifier
 */
export default function ask(source: PipelineStage<Bindings>) {
  const defaultValue: Bindings = new BindingBase();
  const engine = Pipeline.getInstance();
  let op = engine.defaultValues(source, defaultValue);
  op = engine.first(op);
  return engine.map(op, (b) => b.size > 0);
}

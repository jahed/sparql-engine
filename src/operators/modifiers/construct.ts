// SPDX-License-Identifier: MIT
import { compact } from "lodash-es";
import type { ConstructQuery } from "sparqljs";
import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../engine/pipeline/pipeline.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import type { EngineTriple } from "../../types.ts";
import { isVariable, tripleToQuad } from "../../utils/rdf.ts";

/**
 * A ConstructOperator transform solution mappings into RDF triples, according to a template
 * @see {@link https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#construct}
 * @param source  - Source {@link PipelineStage}
 * @param templates - Set of triples patterns in the CONSTRUCT clause
 * @return A {@link PipelineStage} which evaluate the CONSTRUCT modifier
 */
export default function construct(
  source: PipelineStage<Bindings>,
  query: Pick<ConstructQuery, "template">
) {
  const rawTriples: EngineTriple[] = [];
  const templates: EngineTriple[] = (query.template || [])
    .map((t) => tripleToQuad(t))
    .filter((t) => {
      if (
        isVariable(t.subject) ||
        isVariable(t.predicate) ||
        isVariable(t.object)
      ) {
        return true;
      }
      rawTriples.push(t);
      return false;
    });
  const engine = Pipeline.getInstance();
  return engine.endWith(
    engine.flatMap(source, (bindings: Bindings) => {
      return compact(templates.map((t) => bindings.bound(t)));
    }),
    rawTriples
  );
}

// SPDX-License-Identifier: MIT
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import {
  type CustomFunctions,
  SPARQLExpression,
} from "./expressions/sparql-expression.ts";

import type { Expression } from "sparqljs";
import { Bindings } from "../rdf/bindings.ts";
import { literalIsBoolean, termIsLiteral, termToValue } from "../utils/rdf.ts";

/**
 * Evaluate SPARQL Filter clauses
 * @see {@link https://www.w3.org/TR/sparql11-query/#expressions}
 * @param source - Input {@link PipelineStage}
 * @param expression - FILTER expression
 * @param customFunctions - User-defined SPARQL functions (optional)
 * @return A {@link PipelineStage} which evaluate the FILTER operation
 */
export default function sparqlFilter(
  source: PipelineStage<Bindings>,
  expression: Expression,
  customFunctions?: CustomFunctions
) {
  const expr = new SPARQLExpression(expression, customFunctions);
  return Pipeline.getInstance().filterAsync(
    source,
    async (bindings: Bindings) => {
      const result = await expr.evaluate(bindings);
      if (
        result &&
        "datatype" in result &&
        termIsLiteral(result) &&
        literalIsBoolean(result)
      ) {
        return termToValue(result);
      }
      return false;
    }
  );
}

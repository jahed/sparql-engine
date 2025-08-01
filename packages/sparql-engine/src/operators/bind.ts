// SPDX-License-Identifier: MIT
import { isArray } from "lodash-es";

import type { Expression, VariableTerm } from "sparqljs";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import { Bindings } from "../rdf/bindings.ts";
import type { EngineTripleValue } from "../types.ts";
import { UNBOUND } from "../utils/rdf.ts";
import {
  SPARQLExpression,
  type CustomFunctions,
} from "./expressions/sparql-expression.ts";

/**
 * Test if an object is an iterator that yields RDF Terms or null values
 * @param obj - Input object
 * @return True if the input obkect is an iterator, False otherwise
 */
function isIterable(obj: Object): obj is Iterable<EngineTripleValue | null> {
  return Symbol.iterator in obj && typeof obj[Symbol.iterator] === "function";
}

/**
 * Apply a SPARQL BIND clause
 * @see {@link https://www.w3.org/TR/sparql11-query/#bind}
 * @param source - Source {@link PipelineStage}
 * @param variable  - SPARQL variable used to bind results
 * @param expression - SPARQL expression
 * @return A {@link PipelineStage} which evaluate the BIND operation
 */
export default function bind(
  source: PipelineStage<Bindings>,
  variable: VariableTerm,
  expression: Expression,
  customFunctions?: CustomFunctions
): PipelineStage<Bindings> {
  const expr = new SPARQLExpression(expression, customFunctions);
  return Pipeline.getInstance().mergeMapAsync(source, async (bindings) => {
    try {
      const value = await expr.evaluate(bindings);
      if (value && (isArray(value) || isIterable(value))) {
        // build a source of bindings from the array/iterable produced by the expression's evaluation
        return Pipeline.getInstance().fromAsync((input) => {
          try {
            for (let term of value) {
              const mu = bindings.clone();
              if (!term) {
                mu.set(variable.value, UNBOUND);
              } else {
                mu.set(variable.value, term);
              }
              input.next(mu);
            }
          } catch (e) {
            input.error(e);
          }
          input.complete();
        });
      } else {
        // simple case: bound the value to the given variable in the set of bindings
        const res = bindings.clone();
        // null values indicates that an error occurs during the expression's evaluation
        // in this case, the variable is bind to a special UNBOUND value
        if (!value) {
          res.set(variable.value, UNBOUND);
        } else {
          res.set(variable.value, value);
        }
        return Pipeline.getInstance().of(res);
      }
    } catch (e) {
      console.debug("internal bind() error", e);
    }
    return Pipeline.getInstance().empty();
  });
}

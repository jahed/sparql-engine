// SPDX-License-Identifier: MIT
import type {
  PipelineStage,
  StreamPipelineInput,
} from "@jahed/sparql-engine/engine/pipeline/pipeline-engine.js";
import { Pipeline } from "@jahed/sparql-engine/engine/pipeline/pipeline.js";
import type { QueryOutput } from "@jahed/sparql-engine/engine/plan-builder.js";
import { BindingBase, Bindings } from "@jahed/sparql-engine/rdf/bindings.js";
import {
  termIsBNode,
  termIsIRI,
  termIsLiteral,
} from "@jahed/sparql-engine/utils/rdf.js";
import { isBoolean } from "lodash-es";

/**
 * Write the JSON headers
 * @private
 * @param bindings - Input bindings
 * @param input - Output where to write results
 */
function writeHead(bindings: Bindings, input: StreamPipelineInput<string>) {
  const variables = Array.from(bindings.variables())
    .map((v) => (v.startsWith("?") ? `"${v.substring(1)}"` : `"${v}"`))
    .join(",");
  input.next(`"head":{"vars": [${variables}]}`);
}

/**
 * Write a set of bindings as JSON
 * @private
 * @param bindings - Input bindings
 * @param input - Output where to write results
 */
function writeBindings(
  bindings: Bindings,
  input: StreamPipelineInput<string>
): void {
  let cpt = 0;
  bindings.forEach((variable, value) => {
    if (cpt >= 1) {
      input.next(",");
    }
    input.next(`"${variable}":`);
    const term = value;
    if (termIsIRI(term)) {
      input.next(`{"type":"uri","value":"${term.value}"}`);
    } else if (termIsBNode(term)) {
      input.next(`{"type":"bnode","value":"${term.value}"}`);
    } else if (termIsLiteral(term)) {
      if (term.language.length > 0) {
        input.next(
          `{"type":"literal","value":"${term.value}","xml:lang":"${term.language}"}`
        );
      } else if (term.datatype) {
        input.next(
          `{"type":"literal","value":"${term.value}","datatype":"${term.datatype.value}"}`
        );
      } else {
        input.next(`{"type":"literal","value":"${term.value}"}`);
      }
    } else {
      input.error(
        `Invalid RDF term "${value}" encountered during JSON serialization`
      );
    }
    cpt++;
  });
}

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL JSON format
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/
 * @param source - Input pipeline
 * @return A pipeline that yields results in W3C SPARQL JSON format
 */
export default function jsonFormat(
  source: PipelineStage<QueryOutput>
): PipelineStage<string> {
  return Pipeline.getInstance().fromAsync(async (input) => {
    try {
      input.next("{");
      let cpt = 0;
      let isAsk = false;
      for await (const b of source) {
        // Build the head attribute from the first set of bindings
        if (cpt === 0 && b instanceof BindingBase) {
          writeHead(b, input);
          input.next(',"results": {"bindings": [');
        } else if (cpt === 0 && isBoolean(b)) {
          isAsk = true;
          input.next('"boolean":');
        } else if (cpt >= 1) {
          input.next(",");
        }
        // handle results (boolean for ASK queries, bindings for SELECT queries)
        if (isBoolean(b)) {
          input.next(b ? "true" : "false");
        } else if (b instanceof BindingBase) {
          input.next("{");
          writeBindings(b, input);
          input.next("}");
        }
        cpt++;
      }
      input.next(isAsk ? "}" : "]}}");
      input.complete();
    } catch (error) {
      console.error(error);
    }
  });
}

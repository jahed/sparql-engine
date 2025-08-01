// SPDX-License-Identifier: MIT
import { isBoolean, isNull, isUndefined, map } from "lodash-es";

import xml from "xml";
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import { Bindings } from "../rdf/bindings.ts";
import type { EngineTripleValue } from "../types.ts";
import { termIsBNode, termIsIRI, termIsLiteral } from "../utils/rdf.ts";

type Term = EngineTripleValue;
type RDFBindings = { [key: string]: Term };

function _writeBoolean(input: boolean, root: any) {
  root.push({ boolean: input });
}

function _writeBindings(input: Bindings, results: any) {
  // convert sets of bindings into objects of RDF Terms
  let bindings = input
    .filter((value) => !isNull(value[1]) && !isUndefined(value[1]))
    .reduce<RDFBindings>((obj, variable, value) => {
      obj[variable] = value;
      return obj;
    }, {});

  // Write the result tag for this set of bindings
  results.push({
    result: map(bindings, (value, variable) => {
      let xmlTag;
      if (termIsIRI(value)) {
        xmlTag = { uri: value.value };
      } else if (termIsBNode(value)) {
        xmlTag = { bnode: value.value };
      } else if (termIsLiteral(value)) {
        if (value.language === "") {
          xmlTag = {
            literal: [{ _attr: { "xml:lang": value.language } }, value.value],
          };
        } else {
          xmlTag = {
            literal: [
              { _attr: { datatype: value.datatype.value } },
              value.value,
            ],
          };
        }
      } else {
        throw new Error(`Unsupported RDF Term type: ${value}`);
      }
      return {
        binding: [{ _attr: { name: variable.substring(1) } }, xmlTag],
      };
    }),
  });
}

/**
 * Formats query solutions (bindings or booleans) from a PipelineStage in W3C SPARQL XML format
 * @see https://www.w3.org/TR/2013/REC-rdf-sparql-XMLres-20130321/
 * @param source - Input pipeline
 * @return A pipeline s-that yields results in W3C SPARQL XML format
 */
export default function xmlFormat(
  source: PipelineStage<Bindings | boolean>
): PipelineStage<string> {
  return Pipeline.getInstance().fromAsync(async (input) => {
    const results = xml.element({});
    const root = xml.element({
      _attr: { xmlns: "http://www.w3.org/2005/sparql-results#" },
      results: results,
    });
    const stream = xml(
      { sparql: root },
      { stream: true, indent: "\t", declaration: true }
    );
    try {
      let warmup = true;

      for await (const b of source) {
        if (warmup && !isBoolean(b)) {
          const variables: string[] = Array.from(b.variables());
          root.push({
            head: variables
              .filter((name) => name !== "*")
              .map((name) => {
                return { variable: { _attr: { name } } };
              }),
          });
          warmup = false;
        }
        if (isBoolean(b)) {
          _writeBoolean(b, root);
        } else {
          _writeBindings(b, results);
        }
      }
      results.close();
      root.close();
    } catch (error) {
      console.error(error);
    }

    try {
      for await (const data of stream) {
        input.next(data.toString("utf-8"));
      }
      input.complete();
    } catch (error) {
      input.error(error);
    }
  });
}

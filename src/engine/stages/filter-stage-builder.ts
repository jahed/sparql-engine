/*
MIT License

Copyright (c) 2025 The SPARQL Engine Authors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import exists from "../../operators/exists.ts";
import sparqlFilter from "../../operators/sparql-filter.ts";
import StageBuilder from "./stage-builder.ts";

import type { FilterPattern, OperationExpression } from "sparqljs";
import type { CustomFunctions } from "../../operators/expressions/sparql-expression.ts";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";

/**
 * A FilterStageBuilder evaluates FILTER clauses
 */
export default class FilterStageBuilder extends StageBuilder {
  execute(
    source: PipelineStage<Bindings>,
    filterNode: FilterPattern,
    customFunctions: CustomFunctions,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    if ("operator" in filterNode.expression) {
      switch ((filterNode.expression as OperationExpression).operator) {
        case "exists":
          return exists(
            source,
            filterNode.expression.args,
            this.builder!,
            false,
            context
          );
        case "notexists":
          return exists(
            source,
            filterNode.expression.args,
            this.builder!,
            true,
            context
          );
      }
    }
    return sparqlFilter(source, filterNode.expression, customFunctions);
  }
}

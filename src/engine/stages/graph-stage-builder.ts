// SPDX-License-Identifier: MIT
import {
  Wildcard,
  type GraphPattern,
  type IriTerm,
  type Query,
} from "sparqljs";
import type { Bindings } from "../../rdf/bindings.ts";
import { isVariable } from "../../utils/rdf.ts";
import ExecutionContext from "../context/execution-context.ts";
import ContextSymbols from "../context/symbols.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import { Pipeline } from "../pipeline/pipeline.ts";
import StageBuilder from "./stage-builder.ts";

/**
 * A GraphStageBuilder evaluates GRAPH clauses in a SPARQL query.
 */
export default class GraphStageBuilder extends StageBuilder {
  /**
   * Build a {@link PipelineStage} to evaluate a GRAPH clause
   * @param  source  - Input {@link PipelineStage}
   * @param  node    - Graph clause
   * @param  options - Execution options
   * @return A {@link PipelineStage} used to evaluate a GRAPH clause
   */
  execute(
    source: PipelineStage<Bindings>,
    node: GraphPattern,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    let subquery: Query;
    if (node.patterns[0].type === "query") {
      subquery = node.patterns[0] as Query;
    } else {
      subquery = {
        prefixes: context.getProperty(ContextSymbols.PREFIXES),
        queryType: "SELECT",
        variables: [new Wildcard()],
        type: "query",
        where: node.patterns,
      };
    }
    // handle the case where the GRAPh IRI is a SPARQL variable
    if (isVariable(node.name)) {
      // clone the source first
      source = Pipeline.getInstance().clone(source);
      let namedGraphs: IriTerm[] = [];
      // use named graphs is provided, otherwise use all named graphs
      if (context.namedGraphs.length > 0) {
        namedGraphs = context.namedGraphs;
      } else {
        namedGraphs = this._dataset.getAllGraphs(true).map((g) => g.iri);
      }
      // build a pipeline stage that allows to peek on the first set of input bindings
      return Pipeline.getInstance().peekIf(
        source,
        1,
        (values) => {
          return values[0].has(node.name.value);
        },
        (values) => {
          // if the input bindings bound the graph's variable, use it as graph IRI
          const graphIRI = values[0].get(node.name.value) as IriTerm;
          return this._buildIterator(source, graphIRI, subquery, context);
        },
        () => {
          // otherwise, execute the subquery using each graph, and bound the graph var to the graph iri
          return Pipeline.getInstance().merge(
            ...namedGraphs.map((iri) => {
              const stage = this._buildIterator(source, iri, subquery, context);
              return Pipeline.getInstance().map(stage, (bindings) => {
                return bindings.extendMany([[node.name.value, iri]]);
              });
            })
          );
        }
      );
    }
    // otherwise, execute the subquery using the Graph
    return this._buildIterator(source, node.name, subquery, context);
  }

  /**
   * Returns a {@link PipelineStage} used to evaluate a GRAPH clause
   * @param  source    - Input {@link PipelineStage}
   * @param  iri       - IRI of the GRAPH clause
   * @param  subquery  - Subquery to be evaluated
   * @param  options   - Execution options
   * @return A {@link PipelineStage} used to evaluate a GRAPH clause
   */
  _buildIterator(
    source: PipelineStage<Bindings>,
    iri: IriTerm,
    subquery: Query,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    const opts = context.clone();
    opts.defaultGraphs = [iri];
    return this._builder!._buildQueryPlan(subquery, opts, source);
  }
}

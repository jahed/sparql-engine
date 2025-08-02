// SPDX-License-Identifier: MIT
import StageBuilder from "./stage-builder.ts";

import {
  Wildcard,
  type IriTerm,
  type Query,
  type ServicePattern,
} from "sparqljs";
import type { Bindings } from "../../rdf/bindings.ts";
import ExecutionContext from "../context/execution-context.ts";
import ContextSymbols from "../context/symbols.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import { Pipeline } from "../pipeline/pipeline.ts";

/**
 * A ServiceStageBuilder is responsible for evaluation a SERVICE clause in a SPARQL query.
 */
export default class ServiceStageBuilder extends StageBuilder {
  /**
   * Build a {@link PipelineStage} to evaluate a SERVICE clause
   * @param  source  - Input {@link PipelineStage}
   * @param  node    - Service clause
   * @param  options - Execution options
   * @return A {@link PipelineStage} used to evaluate a SERVICE clause
   */
  async execute(
    source: PipelineStage<Bindings>,
    node: ServicePattern,
    context: ExecutionContext
  ): Promise<PipelineStage<Bindings>> {
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
    const iri = node.name as IriTerm;
    if (
      !this.dataset.getDefaultGraph().iri.equals(iri) &&
      !this.dataset.hasNamedGraph(iri)
    ) {
      const graph = await this.dataset.createGraph(iri);
      this.dataset.addNamedGraph(graph);
    }
    let handler = undefined;
    if (node.silent) {
      handler = () => {
        return Pipeline.getInstance().empty<Bindings>();
      };
    }
    return Pipeline.getInstance().catch<Bindings, Bindings>(
      await this._buildIterator(source, iri, subquery, context),
      handler
    );
  }

  /**
   * Returns a {@link PipelineStage} used to evaluate a SERVICE clause
   * @abstract
   * @param source    - Input {@link PipelineStage}
   * @param iri       - Iri of the SERVICE clause
   * @param subquery  - Subquery to be evaluated
   * @param options   - Execution options
   * @return A {@link PipelineStage} used to evaluate a SERVICE clause
   */
  async _buildIterator(
    source: PipelineStage<Bindings>,
    iri: IriTerm,
    subquery: Query,
    context: ExecutionContext
  ): Promise<PipelineStage<Bindings>> {
    const opts = context.clone();
    opts.defaultGraphs = [iri];
    return this._builder!._buildQueryPlan(subquery, opts, source);
  }
}

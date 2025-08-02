// SPDX-License-Identifier: MIT
import type { PropertyPath } from "sparqljs";
import { BindingBase, Bindings } from "../../rdf/bindings.ts";
import Graph from "../../rdf/graph.ts";
import type {
  EngineIRI,
  EngineObject,
  EnginePathTriple,
  EngineSubject,
  EngineTriple,
} from "../../types.ts";
import { isVariable } from "../../utils/rdf.ts";
import ExecutionContext from "../context/execution-context.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import { Pipeline } from "../pipeline/pipeline.ts";
import StageBuilder from "./stage-builder.ts";

/**
 * A fork of Bindings#bound specialized for triple patterns with property paths
 * @private
 * @param  triple   - A triple pattern with a property path
 * @param  bindings - Set of bindings used to bound the triple
 * @return The bounded triple pattern
 */
function boundPathTriple(
  triple: EnginePathTriple,
  bindings: Bindings
): EnginePathTriple {
  const result: Pick<EnginePathTriple, "subject" | "predicate" | "object"> = {
    subject: triple.subject,
    predicate: triple.predicate,
    object: triple.object,
  };
  if (isVariable(triple.subject) && bindings.has(triple.subject.value)) {
    result.subject = bindings.get(triple.subject.value) as EngineSubject;
  }
  if (isVariable(triple.object) && bindings.has(triple.object.value)) {
    result.object = bindings.get(triple.object.value)!;
  }
  return result;
}

/**
 * The base class to implements to evaluate Property Paths.
 * A subclass of this class only has to implement the `_executePropertyPath` method to provide an execution logic for property paths.
 * @abstract
 */
export default abstract class PathStageBuilder extends StageBuilder {
  /**
   * Return the RDF Graph to be used for BGP evaluation.
   * * If `iris` is empty, returns the default graph
   * * If `iris` has a single entry, returns the corresponding named graph
   * * Otherwise, returns an UnionGraph based on the provided iris
   * @param  iris - List of Graph's iris
   * @return An RDF Graph
   */
  async _getGraph(iris: EngineIRI[]): Promise<Graph> {
    if (iris.length === 0) {
      return this._dataset.getDefaultGraph();
    } else if (iris.length === 1) {
      return this._dataset.getNamedGraph(iris[0]);
    }
    return this._dataset.getUnionGraph(iris);
  }

  /**
   * Get a {@link PipelineStage} for evaluating a succession of property paths, connected by joins.
   * @param source - Input {@link PipelineStage}
   * @param  triples - Triple patterns
   * @param  context - Execution context
   * @return A {@link PipelineStage} which yield set of bindings from the pipeline of joins
   */
  async execute(
    source: PipelineStage<Bindings>,
    triples: EnginePathTriple[],
    context: ExecutionContext
  ): Promise<PipelineStage<Bindings>> {
    // create a join pipeline between all property paths using an index join
    const engine = Pipeline.getInstance();
    return triples.reduce((iter, triple) => {
      return engine.mergeMapAsync(iter, async (bindings) => {
        const bounded = boundPathTriple(triple, bindings);
        return engine.map(
          await this._buildIterator(
            bounded.subject,
            bounded.predicate,
            bounded.object,
            context
          ),
          (b: Bindings) => bindings.union(b)
        );
      });
    }, source);
  }

  /**
   * Get a {@link PipelineStage} for evaluating the property path.
   * @param  subject - Path subject
   * @param  path  - Property path
   * @param  obj   - Path object
   * @param  context - Execution context
   * @return A {@link PipelineStage} which yield set of bindings
   */
  async _buildIterator(
    subject: EngineSubject,
    path: PropertyPath,
    obj: EngineObject,
    context: ExecutionContext
  ): Promise<PipelineStage<Bindings>> {
    const graph =
      context.defaultGraphs.length > 0
        ? await this._getGraph(context.defaultGraphs)
        : this._dataset.getDefaultGraph();
    const evaluator = this._executePropertyPath(
      subject,
      path,
      obj,
      graph,
      context
    );
    return Pipeline.getInstance().map(evaluator, (triple: EngineTriple) => {
      const temp = new BindingBase();
      if (isVariable(subject)) {
        temp.set(subject.value, triple.subject);
      }
      if (isVariable(obj)) {
        temp.set(obj.value, triple.object);
      }
      // TODO: change the function's behavior for ask queries when subject and object are given
      if (!isVariable(subject) && !isVariable(obj)) {
        temp.set("ask_s", triple.subject);
        temp.set("ask_v", triple.object);
      }
      return temp;
    });
  }

  /**
   * Execute a property path against a RDF Graph.
   * @param  subject - Path subject
   * @param  path  - Property path
   * @param  obj   - Path object
   * @param  graph - RDF graph
   * @param  context - Execution context
   * @return A {@link PipelineStage} which yield RDF triples matching the property path
   */
  abstract _executePropertyPath(
    subject: EngineSubject,
    path: PropertyPath,
    obj: EngineObject,
    graph: Graph,
    context: ExecutionContext
  ): PipelineStage<EngineTriple>;
}

/* file : glushkov-stage-builder.ts
MIT License

Copyright (c) 2019 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import type { PropertyPath } from "sparqljs";
import type { PipelineStage } from "../../../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../../../engine/pipeline/pipeline.ts";
import { Bindings } from "../../../rdf/bindings.ts";
import Graph from "../../../rdf/graph.ts";
import type {
  EngineObject,
  EnginePredicate,
  EngineSubject,
  EngineTriple,
  EngineTripleValue,
} from "../../../types.ts";
import * as rdf from "../../../utils/rdf.ts";
import ExecutionContext from "../../context/execution-context.ts";
import PathStageBuilder from "../path-stage-builder.ts";
import { Automaton, Transition } from "./automaton.ts";
import { GlushkovBuilder } from "./automatonBuilder.ts";

/**
 * A Step in the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
class Step {
  private _node: EngineTripleValue;
  private _state: number;

  /**
   * Constructor
   * @param node - The label of a node in the RDF Graph
   * @param state - The ID of a State in the Automaton
   */
  constructor(node: EngineTripleValue, state: number) {
    this._node = node;
    this._state = state;
  }

  /**
   * Get the Automaton's state associated with this Step of the ResultPath
   * @return The Automaton's state associated with this Step
   */
  get state(): number {
    return this._state;
  }

  /**
   * Get the RDF Graph's node associated with this Step of the ResultPath
   * @return The RDF Graph's node associated with this Step
   */
  get node(): EngineTripleValue {
    return this._node;
  }

  /**
   * Test if the given Step is equal to this Step
   * @param step - Step tested
   * @return True if the Steps are equal, False otherwise
   */
  equals(step: Step): boolean {
    return this.node === step.node && this.state === step.state;
  }

  /**
   * Build a clone of this Step
   * @return A copy of this Step
   */
  clone(): Step {
    let copy = new Step(this._node, this._state);
    return copy;
  }
}

/**
 * A solution path, found during the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
class ResultPath {
  private _steps: Array<Step>;

  /**
   * Constructor
   */
  constructor() {
    this._steps = new Array<Step>();
  }

  /**
   * Add a Step to the ResultPath
   * @param step - New Step to add
   */
  add(step: Step) {
    this._steps.push(step);
  }

  /**
   * Return the last Step of the ResultPath
   * @return The last Step of the ResultPath
   */
  lastStep(): Step {
    return this._steps[this._steps.length - 1];
  }

  /**
   * Return the first Step of the ResultPath
   * @return The first Step of the ResultPath
   */
  firstStep(): Step {
    return this._steps[0];
  }

  /**
   * Test if a Step is already contained in the ResultPath
   * @param step - Step we're looking for in the ResultPath
   * @return True if the given Step is in the ResultPath, False otherwise
   */
  contains(step: Step): boolean {
    return (
      this._steps.findIndex((value: Step) => {
        return value.equals(step);
      }) > -1
    );
  }

  /**
   * Build a clone of this ResultPath
   * @return A copy of this ResultPath
   */
  clone(): ResultPath {
    let copy = new ResultPath();
    this._steps.forEach((step) => {
      copy.add(step);
    });
    return copy;
  }
}

/**
 * A GlushkovStageBuilder is responsible for evaluation a SPARQL property path query using a Glushkov state automata.
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
export default class GlushkovStageBuilder extends PathStageBuilder {
  /**
   * Continues the execution of the SPARQL property path and builds the result's paths
   * @param rPath - Path being processed
   * @param obj - Path object
   * @param graph - RDF graph
   * @param context - Execution context
   * @param automaton - Automaton used to evaluate the SPARQL property path
   * @param forward - if True the walk proceeds through outgoing edges, otherwise the walk proceeds in reverse direction
   * @return An Observable which yield RDF triples matching the property path
   */
  evaluatePropertyPath(
    rPath: ResultPath,
    obj: EngineTripleValue,
    graph: Graph,
    context: ExecutionContext,
    automaton: Automaton<number, EnginePredicate>,
    forward: boolean
  ): PipelineStage<EngineTriple> {
    const engine = Pipeline.getInstance();
    let self = this;
    let lastStep: Step = rPath.lastStep();
    let result: PipelineStage<EngineTriple> = engine.empty();
    if (forward) {
      if (
        automaton.isFinal(lastStep.state) &&
        (rdf.isVariable(obj) ? true : lastStep.node.equals(obj))
      ) {
        let subject = rPath.firstStep().node;
        let object = rPath.lastStep().node;
        result = engine.of<EngineTriple>(
          rdf.dataFactory.quad(
            subject as EngineSubject,
            rdf.dataFactory.namedNode(""),
            object
          )
        );
      }
    } else {
      if (automaton.isInitial(lastStep.state)) {
        let subject = rPath.lastStep().node;
        let object = rPath.firstStep().node;
        result = engine.of<EngineTriple>(
          rdf.dataFactory.quad(
            subject as EngineSubject,
            rdf.dataFactory.namedNode(""),
            object
          )
        );
      }
    }
    let transitions: Array<Transition<number, EnginePredicate>>;
    if (forward) {
      transitions = automaton.getTransitionsFrom(lastStep.state);
    } else {
      transitions = automaton.getTransitionsTo(lastStep.state);
    }
    let obs: PipelineStage<EngineTriple>[] = transitions.map((transition) => {
      let reverse =
        (forward && transition.reverse) || (!forward && !transition.reverse);
      let bgp: Array<EngineTriple> = [
        rdf.dataFactory.quad(
          reverse
            ? rdf.dataFactory.variable("o")
            : (lastStep.node as EngineSubject),
          transition.negation
            ? rdf.dataFactory.variable("p")
            : transition.predicates[0],
          reverse ? lastStep.node : rdf.dataFactory.variable("o")
        ),
      ];
      return engine.mergeMap(
        engine.from(graph.evalBGP(bgp, context)),
        (binding: Bindings) => {
          let p = binding.get("p");
          let o = binding.get("o")!;
          if (p !== null ? !transition.hasPredicate(p) : true) {
            let newStep;
            if (forward) {
              newStep = new Step(o, transition.to.name);
            } else {
              newStep = new Step(o, transition.from.name);
            }
            if (!rPath.contains(newStep)) {
              let newPath = rPath.clone();
              newPath.add(newStep);
              return self.evaluatePropertyPath(
                newPath,
                obj,
                graph,
                context,
                automaton,
                forward
              );
            }
          }
          return engine.empty();
        }
      );
    });
    return engine.merge(...obs, result);
  }

  /**
   * Execute a reflexive closure against a RDF Graph.
   * @param subject - Path subject
   * @param obj - Path object
   * @param graph - RDF graph
   * @param context - Execution context
   * @return An Observable which yield RDF triples retrieved after the evaluation of the reflexive closure
   */
  reflexiveClosure(
    subject: EngineSubject,
    obj: EngineObject,
    graph: Graph,
    context: ExecutionContext
  ): PipelineStage<EngineTriple> {
    const engine = Pipeline.getInstance();
    if (rdf.isVariable(subject) && !rdf.isVariable(obj)) {
      let result: EngineTriple = rdf.dataFactory.quad(
        obj as EngineSubject,
        rdf.dataFactory.namedNode(""),
        obj
      );
      return engine.of(result);
    } else if (!rdf.isVariable(subject) && rdf.isVariable(obj)) {
      let result: EngineTriple = rdf.dataFactory.quad(
        subject,
        rdf.dataFactory.namedNode(""),
        subject
      );
      return engine.of(result);
    } else if (rdf.isVariable(subject) && rdf.isVariable(obj)) {
      let bgp: Array<EngineTriple> = [
        rdf.dataFactory.quad(
          rdf.dataFactory.variable("s"),
          rdf.dataFactory.variable("p"),
          rdf.dataFactory.variable("o")
        ),
      ];
      return engine.distinct(
        engine.mergeMap(
          engine.from(graph.evalBGP(bgp, context)),
          (binding: Bindings) => {
            let s = binding.get("s")!;
            let o = binding.get("o")!;
            let t1: EngineTriple = rdf.dataFactory.quad(
              s as EngineSubject,
              rdf.dataFactory.namedNode(""),
              s
            );
            let t2: EngineTriple = rdf.dataFactory.quad(
              o as EngineSubject,
              rdf.dataFactory.namedNode(""),
              o
            );
            return engine.of(t1, t2);
          }
        ),
        (triple: EngineTriple) => triple.subject
      );
    }
    if (subject === obj) {
      let result = rdf.dataFactory.quad(
        subject,
        rdf.dataFactory.namedNode(""),
        obj
      );
      return engine.of(result);
    }
    return engine.empty();
  }

  /**
   * Starts the execution of a property path against a RDF Graph.
   * - executes the reflexive closure if the path expression contains the empty word
   * - builds the first step of the result's paths
   * @param subject - Path subject
   * @param obj - Path object
   * @param graph - RDF graph
   * @param context - Execution context
   * @param automaton - Automaton used to evaluate the SPARQL property path
   * @param forward - if True the walk starts from the subject, otherwise the walk starts from the object
   * @return An Observable which yield RDF triples matching the property path
   */
  startPropertyPathEvaluation(
    subject: EngineSubject,
    obj: EngineObject,
    graph: Graph,
    context: ExecutionContext,
    automaton: Automaton<number, EnginePredicate>,
    forward: boolean
  ): PipelineStage<EngineTriple> {
    const engine = Pipeline.getInstance();
    let self = this;
    let reflexiveClosureResults: PipelineStage<EngineTriple> =
      automaton.isFinal(0)
        ? this.reflexiveClosure(subject, obj, graph, context)
        : engine.empty();
    let transitions: Array<Transition<number, EnginePredicate>>;
    if (forward) {
      transitions = automaton.getTransitionsFrom(0);
    } else {
      transitions = automaton.getTransitionsToFinalStates();
    }
    let obs: PipelineStage<EngineTriple>[] = transitions.map((transition) => {
      let reverse =
        (forward && transition.reverse) || (!forward && !transition.reverse);
      let bgp: Array<EngineTriple> = [
        rdf.dataFactory.quad(
          reverse
            ? rdf.isVariable(obj)
              ? rdf.dataFactory.variable("o")
              : (obj as EngineSubject)
            : subject,
          transition.negation
            ? rdf.dataFactory.variable("p")
            : transition.predicates[0],
          reverse
            ? subject
            : rdf.isVariable(obj)
              ? rdf.dataFactory.variable("o")
              : obj
        ),
      ];

      return engine.mergeMap(
        engine.from(graph.evalBGP(bgp, context)),
        (binding: Bindings) => {
          let s = rdf.isVariable(subject)
            ? binding.get(subject.value)!
            : subject;
          let p = binding.get("p");
          let o = rdf.isVariable(obj) ? binding.get("o")! : obj;

          if (p !== null ? !transition.hasPredicate(p) : true) {
            let path = new ResultPath();
            if (forward) {
              path.add(new Step(s, transition.from.name));
              path.add(new Step(o, transition.to.name));
            } else {
              path.add(new Step(s, transition.to.name));
              path.add(new Step(o, transition.from.name));
            }
            return self.evaluatePropertyPath(
              path,
              obj,
              graph,
              context,
              automaton,
              forward
            );
          }
          return engine.empty();
        }
      );
    });
    return engine.merge(...obs, reflexiveClosureResults);
  }

  /**
   * Execute a property path against a RDF Graph.
   * @param  subject - Path subject
   * @param  path  - Property path
   * @param  obj   - Path object
   * @param  graph - RDF graph
   * @param  context - Execution context
   * @return An Observable which yield RDF triples matching the property path
   */
  _executePropertyPath(
    subject: EngineSubject,
    path: PropertyPath,
    obj: EngineObject,
    graph: Graph,
    context: ExecutionContext
  ): PipelineStage<EngineTriple> {
    let automaton: Automaton<number, EnginePredicate> = new GlushkovBuilder(
      path
    ).build();
    if (rdf.isVariable(subject) && !rdf.isVariable(obj)) {
      return this.startPropertyPathEvaluation(
        obj as EngineSubject,
        subject,
        graph,
        context,
        automaton,
        false
      );
    } else {
      return this.startPropertyPathEvaluation(
        subject,
        obj,
        graph,
        context,
        automaton,
        true
      );
    }
  }
}

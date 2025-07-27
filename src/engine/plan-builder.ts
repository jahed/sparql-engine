/* file : plan-builder.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

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

// General libraries
import {
  Parser,
  type BgpPattern,
  type ConstructQuery,
  type Pattern,
  type Query,
  type SparqlParser,
  type Triple,
  type Variable,
  type VariableExpression,
} from "sparqljs";
import type { Consumable } from "../operators/update/consumer.ts";
// pipelining engine
import type { PipelineStage } from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
// RDF core classes
import { BindingBase, Bindings } from "../rdf/bindings.ts";
import Dataset from "../rdf/dataset.ts";
// Optimization
import Optimizer from "../optimizer/optimizer.ts";
// Solution modifiers
import ask from "../operators/modifiers/ask.ts";
import construct from "../operators/modifiers/construct.ts";
import select from "../operators/modifiers/select.ts";
// Stage builders
import AggregateStageBuilder from "./stages/aggregate-stage-builder.ts";
import BGPStageBuilder from "./stages/bgp-stage-builder.ts";
import BindStageBuilder from "./stages/bind-stage-builder.ts";
import DistinctStageBuilder from "./stages/distinct-stage-builder.ts";
import FilterStageBuilder from "./stages/filter-stage-builder.ts";
import GlushkovStageBuilder from "./stages/glushkov-executor/glushkov-stage-builder.ts";
import GraphStageBuilder from "./stages/graph-stage-builder.ts";
import MinusStageBuilder from "./stages/minus-stage-builder.ts";
import OptionalStageBuilder from "./stages/optional-stage-builder.ts";
import OrderByStageBuilder from "./stages/orderby-stage-builder.ts";
import ServiceStageBuilder from "./stages/service-stage-builder.ts";
import StageBuilder from "./stages/stage-builder.ts";
import UnionStageBuilder from "./stages/union-stage-builder.ts";
import UpdateStageBuilder from "./stages/update-stage-builder.ts";
// caching
import { LRUBGPCache, type BGPCache } from "./cache/bgp-cache.ts";
// utilities
import { isNull, isUndefined, partition, some, sortBy } from "lodash-es";

import type { CustomFunctions } from "../operators/expressions/sparql-expression.ts";
import type { EngineTriple } from "../types.ts";
import { deepApplyBindings, extendByBindings } from "../utils.ts";
import * as rdf from "../utils/rdf.ts";
import { dataFactory } from "../utils/rdf.ts";
import ExecutionContext from "./context/execution-context.ts";
import ContextSymbols from "./context/symbols.ts";
import { extractPropertyPaths } from "./stages/rewritings.ts";

/**
 * Output of a physical query execution plan
 */
export type QueryOutput = Bindings | EngineTriple | boolean;

/*
 * Class of SPARQL operations that are evaluated by a Stage Builder
 */
export type SparqlOperation = number;
export const SPARQL_OPERATION = {
  AGGREGATE: 0,
  BGP: 1,
  BIND: 2,
  DISTINCT: 3,
  FILTER: 4,
  GRAPH: 5,
  MINUS: 6,
  OPTIONAL: 7,
  ORDER_BY: 8,
  PROPERTY_PATH: 9,
  SERVICE: 10,
  UPDATE: 11,
  UNION: 12,
};

/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * Internally, it implements a Builder design pattern, where various {@link StageBuilder} are used
 * for building each part of the query execution plan.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export class PlanBuilder {
  private readonly _parser: SparqlParser;
  private _optimizer: Optimizer;
  private _stageBuilders: Map<SparqlOperation, StageBuilder>;
  public _currentCache: BGPCache | null; // Public for tests.
  private _dataset: Dataset;
  private _customFunctions?: CustomFunctions;

  /**
   * Constructor
   * @param _dataset - RDF Dataset used for query execution
   * @param _prefixes - Optional prefixes to use during query processing
   */
  constructor(
    dataset: Dataset,
    prefixes: any = {},
    customFunctions?: CustomFunctions
  ) {
    this._dataset = dataset;
    this._customFunctions = customFunctions;
    this._parser = new Parser(prefixes);
    this._optimizer = Optimizer.getDefault();
    this._currentCache = null;
    this._stageBuilders = new Map();

    // add default stage builders
    this.use(
      SPARQL_OPERATION.AGGREGATE,
      new AggregateStageBuilder(this._dataset)
    );
    this.use(SPARQL_OPERATION.BGP, new BGPStageBuilder(this._dataset));
    this.use(SPARQL_OPERATION.BIND, new BindStageBuilder(this._dataset));
    this.use(
      SPARQL_OPERATION.DISTINCT,
      new DistinctStageBuilder(this._dataset)
    );
    this.use(SPARQL_OPERATION.FILTER, new FilterStageBuilder(this._dataset));
    this.use(SPARQL_OPERATION.GRAPH, new GraphStageBuilder(this._dataset));
    this.use(SPARQL_OPERATION.MINUS, new MinusStageBuilder(this._dataset));
    this.use(SPARQL_OPERATION.SERVICE, new ServiceStageBuilder(this._dataset));
    this.use(
      SPARQL_OPERATION.OPTIONAL,
      new OptionalStageBuilder(this._dataset)
    );
    this.use(SPARQL_OPERATION.ORDER_BY, new OrderByStageBuilder(this._dataset));
    this.use(
      SPARQL_OPERATION.PROPERTY_PATH,
      new GlushkovStageBuilder(this._dataset)
    );
    this.use(SPARQL_OPERATION.UNION, new UnionStageBuilder(this._dataset));
    this.use(SPARQL_OPERATION.UPDATE, new UpdateStageBuilder(this._dataset));
  }

  /**
   * Set a new {@link Optimizer} uszed to optimize logical SPARQL query execution plans
   * @param  opt - New optimizer to use
   */
  set optimizer(opt: Optimizer) {
    this._optimizer = opt;
  }

  /**
   * Register a Stage Builder to evaluate a class of SPARQL operations
   * @param  kind         - Class of SPARQL operations handled by the Stage Builder
   * @param  stageBuilder - New Stage Builder
   */
  use(kind: SparqlOperation, stageBuilder: StageBuilder) {
    // complete handshake
    stageBuilder.builder = null;
    stageBuilder.builder = this;
    this._stageBuilders.set(kind, stageBuilder);
  }

  /**
   * Enable Basic Graph Patterns semantic caching for SPARQL query evaluation.
   * The parameter is optional and used to provide your own cache instance.
   * If left undefined, the query engine will use a {@link LRUBGPCache} with
   * a maximum of 500 items and a max age of 20 minutes.
   * @param customCache - (optional) Custom cache instance
   */
  useCache(customCache?: BGPCache): void {
    if (customCache === undefined) {
      this._currentCache = new LRUBGPCache(500, 1200 * 60 * 60);
    } else {
      this._currentCache = customCache;
    }
  }

  /**
   * Disable Basic Graph Patterns semantic caching for SPARQL query evaluation.
   */
  disableCache(): void {
    this._currentCache = null;
  }

  /**
   * Build the physical query execution of a SPARQL 1.1 query
   * and returns a {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
   * @param  query    - SPARQL query to evaluated
   * @param  options  - Execution options
   * @return A {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
   */
  build(query: any, context?: ExecutionContext): PipelineStage<QueryOutput> {
    // If needed, parse the string query into a logical query execution plan
    if (typeof query === "string") {
      query = this._parser.parse(query);
    }
    if (isNull(context) || isUndefined(context)) {
      context = new ExecutionContext();
      context.cache = this._currentCache;
    }
    // Optimize the logical query execution plan
    query = this._optimizer.optimize(query);
    // build physical query execution plan, depending on the query type
    switch (query.type) {
      case "query":
        return this._buildQueryPlan(query, context);
      case "update":
        if (!this._stageBuilders.has(SPARQL_OPERATION.UPDATE)) {
          throw new Error(
            "A PlanBuilder cannot evaluate SPARQL UPDATE queries without a StageBuilder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.UPDATE)!
          .execute(query.updates, context);
      default:
        throw new SyntaxError(`Unsupported SPARQL query type: ${query.type}`);
    }
  }

  /**
   * Build the physical query execution of a SPARQL query
   * @param  query    - Parsed SPARQL query
   * @param  options  - Execution options
   * @param  source   - Input {@link PipelineStage}
   * @return A {@link PipelineStage} that can be consumed to evaluate the query.
   */
  _buildQueryPlan(
    query: Query,
    context: ExecutionContext,
    source?: PipelineStage<Bindings>
  ): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance();
    if (isNull(source) || isUndefined(source)) {
      // build pipeline starting iterator
      source = engine.of(new BindingBase());
    }
    context.setProperty(ContextSymbols.PREFIXES, query.prefixes);

    // rewrite a DESCRIBE query into a CONSTRUCT query
    if (query.queryType === "DESCRIBE") {
      const template: Triple[] = [];
      const where: any = [
        {
          type: "bgp",
          triples: [],
        },
      ];
      query.variables.forEach((v: any) => {
        const triple = dataFactory.quad(
          v,
          dataFactory.variable(`pred__describe__${v}`),
          dataFactory.variable(`obj__describe__${v}`)
        );
        template.push(triple);
        where[0].triples.push(triple);
      });
      const construct: ConstructQuery = {
        prefixes: query.prefixes,
        from: query.from,
        queryType: "CONSTRUCT",
        template,
        type: "query",
        where: query.where?.concat(where),
      };
      return this._buildQueryPlan(construct, context, source);
    }

    // from the begining, dectect any LIMIT/OFFSET modifiers, as they cimpact the caching strategy
    context.setProperty(
      ContextSymbols.HAS_LIMIT_OFFSET,
      "limit" in query || "offset" in query
    );

    // Handles FROM clauses
    if (query.from) {
      context.defaultGraphs = query.from.default;
      context.namedGraphs = query.from.named;
    }

    // Handles WHERE clause
    let graphIterator: PipelineStage<Bindings>;
    if (query.where?.length) {
      graphIterator = this._buildWhere(source, query.where, context);
    } else {
      graphIterator = engine.of(new BindingBase());
    }

    let aggregates: VariableExpression[] = [];

    // Parse query variable to separate projection & aggregate variables
    if ("variables" in query) {
      const next: Variable[] = [];
      for (const v of query.variables as Variable[]) {
        if ("variable" in v) {
          aggregates.push(v);
          next.push(v.variable);
        } else {
          next.push(v);
        }
      }
      query.variables = next;
    }

    // Handles SPARQL aggregations
    if ("group" in query || aggregates.length > 0) {
      // Handles GROUP BY
      graphIterator = this._stageBuilders
        .get(SPARQL_OPERATION.AGGREGATE)!
        .execute(
          graphIterator,
          query,
          context,
          this._customFunctions
        ) as PipelineStage<Bindings>;
    }

    if (aggregates.length > 0) {
      // Handles SPARQL aggregation functions
      graphIterator = aggregates.reduce(
        (prev: PipelineStage<Bindings>, agg) => {
          const op = this._stageBuilders
            .get(SPARQL_OPERATION.BIND)!
            .execute(prev, agg, this._customFunctions, context);
          return op as PipelineStage<Bindings>;
        },
        graphIterator
      );
    }

    // Handles ORDER BY
    if ("order" in query) {
      if (!this._stageBuilders.has(SPARQL_OPERATION.ORDER_BY)) {
        throw new Error(
          "A PlanBuilder cannot evaluate SPARQL ORDER BY clauses without a StageBuilder for it"
        );
      }
      graphIterator = this._stageBuilders
        .get(SPARQL_OPERATION.ORDER_BY)!
        .execute(graphIterator, query.order!) as PipelineStage<Bindings>;
    }

    switch (query.queryType) {
      case "SELECT": {
        graphIterator = select(graphIterator, query);
        break;
      }
      case "CONSTRUCT": {
        graphIterator = construct(
          graphIterator,
          query
        ) as unknown as PipelineStage<Bindings>;
        break;
      }
      case "ASK": {
        graphIterator = ask(
          graphIterator
        ) as unknown as PipelineStage<Bindings>;
        break;
      }
      default: {
        throw new Error("Unsupported SPARQL query type.");
      }
    }

    // Create iterators for modifiers
    if ("distinct" in query && query.distinct) {
      if (!this._stageBuilders.has(SPARQL_OPERATION.DISTINCT)) {
        throw new Error(
          "A PlanBuilder cannot evaluate a DISTINCT clause without a StageBuilder for it"
        );
      }
      graphIterator = this._stageBuilders
        .get(SPARQL_OPERATION.DISTINCT)!
        .execute(graphIterator, context) as PipelineStage<Bindings>;
    }

    // Add offsets and limits if requested
    if ("offset" in query) {
      graphIterator = engine.skip(graphIterator, query.offset!);
    }
    if ("limit" in query) {
      graphIterator = engine.limit(graphIterator, query.limit!);
    }
    // graphIterator.queryType = query.queryType
    return graphIterator;
  }

  /**
   * Optimize a WHERE clause and build the corresponding physical plan
   * @param  source  - Input {@link PipelineStage}
   * @param  groups   - WHERE clause to process
   * @param  options  - Execution options
   * @return A {@link PipelineStage} used to evaluate the WHERE clause
   */
  _buildWhere(
    source: PipelineStage<Bindings>,
    groups: Pattern[],
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    groups = sortBy(groups, (g) => {
      switch (g.type) {
        case "graph":
          if (rdf.isVariable(g.name)) {
            return 5;
          }
          return 0;
        case "bgp":
          return 0;
        case "values":
          return 3;
        case "filter":
          return 4;
        default:
          return 1;
      }
    });

    // Handle VALUES clauses using query rewriting
    if (some(groups, (g) => g.type === "values")) {
      return this._buildValues(source, groups, context);
    }

    // merge BGPs on the same level
    let newGroups = [];
    let prec = null;
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      if (group.type === "bgp" && prec !== null && prec.type === "bgp") {
        let lastGroup = newGroups[newGroups.length - 1] as BgpPattern;
        lastGroup.triples = lastGroup.triples.concat(group.triples);
      } else {
        newGroups.push(group);
      }
      prec = groups[i];
    }
    groups = newGroups;

    return groups.reduce((source, group) => {
      return this._buildGroup(source, group, context);
    }, source);
  }

  /**
   * Build a physical plan for a SPARQL group clause
   * @param  source  - Input {@link PipelineStage}
   * @param  group   - SPARQL Group
   * @param  options - Execution options
   * @return A {@link PipelineStage} used to evaluate the SPARQL Group
   */
  _buildGroup(
    source: PipelineStage<Bindings>,
    group: Pattern,
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance();
    // Reset flags on the options for child iterators
    let childContext = context.clone();

    switch (group.type) {
      case "bgp":
        if (!this._stageBuilders.has(SPARQL_OPERATION.BGP)) {
          throw new Error(
            "A PlanBuilder cannot evaluate a Basic Graph Pattern without a Stage Builder for it"
          );
        }
        // find possible Property paths
        let [classicTriples, pathTriples] = extractPropertyPaths(group);
        if (pathTriples.length > 0) {
          if (!this._stageBuilders.has(SPARQL_OPERATION.PROPERTY_PATH)) {
            throw new Error(
              "A PlanBuilder cannot evaluate property paths without a Stage Builder for it"
            );
          }
          source = this._stageBuilders
            .get(SPARQL_OPERATION.PROPERTY_PATH)!
            .execute(source, pathTriples, context) as PipelineStage<Bindings>;
        }

        // delegate remaining BGP evaluation to the dedicated executor
        let iter = this._stageBuilders.get(SPARQL_OPERATION.BGP)!.execute(
          source,
          classicTriples,
          childContext
        ) as PipelineStage<Bindings>;

        return iter;
      case "query":
        return this._buildQueryPlan(group, childContext, source);
      case "graph":
        if (!this._stageBuilders.has(SPARQL_OPERATION.GRAPH)) {
          throw new Error(
            "A PlanBuilder cannot evaluate a GRAPH clause without a Stage Builder for it"
          );
        }
        // delegate GRAPH evaluation to an executor
        return this._stageBuilders
          .get(SPARQL_OPERATION.GRAPH)!
          .execute(source, group, childContext) as PipelineStage<Bindings>;
      case "service":
        if (!this._stageBuilders.has(SPARQL_OPERATION.SERVICE)) {
          throw new Error(
            "A PlanBuilder cannot evaluate a SERVICE clause without a Stage Builder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.SERVICE)!
          .execute(source, group, childContext) as PipelineStage<Bindings>;
      case "group":
        return this._buildWhere(source, group.patterns, childContext);
      case "optional":
        if (!this._stageBuilders.has(SPARQL_OPERATION.OPTIONAL)) {
          throw new Error(
            "A PlanBuilder cannot evaluate an OPTIONAL clause without a Stage Builder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.OPTIONAL)!
          .execute(source, group, childContext) as PipelineStage<Bindings>;
      case "union":
        if (!this._stageBuilders.has(SPARQL_OPERATION.UNION)) {
          throw new Error(
            "A PlanBuilder cannot evaluate an UNION clause without a Stage Builder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.UNION)!
          .execute(source, group, childContext) as PipelineStage<Bindings>;
      case "minus":
        if (!this._stageBuilders.has(SPARQL_OPERATION.MINUS)) {
          throw new Error(
            "A PlanBuilder cannot evaluate a MINUS clause without a Stage Builder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.MINUS)!
          .execute(source, group, childContext) as PipelineStage<Bindings>;
      case "filter":
        if (!this._stageBuilders.has(SPARQL_OPERATION.FILTER)) {
          throw new Error(
            "A PlanBuilder cannot evaluate a FILTER clause without a Stage Builder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.FILTER)!
          .execute(
            source,
            group,
            this._customFunctions,
            childContext
          ) as PipelineStage<Bindings>;
      case "bind":
        if (!this._stageBuilders.has(SPARQL_OPERATION.BIND)) {
          throw new Error(
            "A PlanBuilder cannot evaluate a BIND clause without a Stage Builder for it"
          );
        }
        return this._stageBuilders
          .get(SPARQL_OPERATION.BIND)!
          .execute(
            source,
            group,
            this._customFunctions,
            childContext
          ) as PipelineStage<Bindings>;
      default:
        throw new Error(
          `Unsupported SPARQL group pattern found in query: ${group.type}`
        );
    }
  }

  /**
   * Build a {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s).
   * It rely on a query rewritiing approach:
   * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
   * @param source  - Input {@link PipelineStage}
   * @param groups  - Query body, i.e., WHERE clause
   * @param options - Execution options
   * @return A {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s)
   */
  _buildValues(
    source: PipelineStage<Bindings>,
    groups: Pattern[],
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    let [values, others] = partition(groups, (g) => g.type === "values");
    const bindingsLists = values.map((g) => g.values);
    // for each VALUES clause
    const iterators = bindingsLists.map((bList) => {
      // for each value to bind in the VALUES clause
      const unionBranches = bList.map((b) => {
        const bindings = BindingBase.fromValuePatternRow(b);
        // BIND each group with the set of bindings and then evaluates it
        const temp = others.map((g) => deepApplyBindings(g, bindings));
        return extendByBindings(
          this._buildWhere(source, temp, context),
          bindings
        );
      });
      return Pipeline.getInstance().merge(...unionBranches);
    });
    // Users may use more than one VALUES clause
    if (iterators.length > 1) {
      return Pipeline.getInstance().merge(...iterators);
    }
    return iterators[0];
  }
}

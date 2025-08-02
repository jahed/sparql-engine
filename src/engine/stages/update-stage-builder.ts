// SPDX-License-Identifier: MIT
import {
  Wildcard,
  type BgpPattern,
  type ClearDropOperation,
  type GraphQuads,
  type InsertDeleteOperation,
  type IriTerm,
  type Query,
  type UpdateOperation,
} from "sparqljs";
import construct from "../../operators/modifiers/construct.ts";
import ActionConsumer from "../../operators/update/action-consumer.ts";
import ClearConsumer from "../../operators/update/clear-consumer.ts";
import {
  ErrorConsumable,
  type Consumable,
} from "../../operators/update/consumer.ts";
import DeleteConsumer from "../../operators/update/delete-consumer.ts";
import InsertConsumer from "../../operators/update/insert-consumer.ts";
import ManyConsumers from "../../operators/update/many-consumers.ts";
import NoopConsumer from "../../operators/update/nop-consumer.ts";
import { BindingBase, Bindings } from "../../rdf/bindings.ts";
import Graph from "../../rdf/graph.ts";
import ExecutionContext from "../context/execution-context.ts";
import ContextSymbols from "../context/symbols.ts";
import type { PipelineStage } from "../pipeline/pipeline-engine.ts";
import { Pipeline } from "../pipeline/pipeline.ts";
import { rewriteAdd, rewriteCopy, rewriteMove } from "./rewritings.ts";
import StageBuilder from "./stage-builder.ts";

/**
 * An UpdateStageBuilder evaluates SPARQL UPDATE queries.
 * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321
 */
export default class UpdateStageBuilder extends StageBuilder {
  /**
   * Create a {@link Consumable} used to evaluate a SPARQL 1.1 Update query
   * @param updates - Set of Update queries to execute
   * @param options - Execution options
   * @return A Consumable used to evaluatethe set of update queries
   */
  async execute(
    updates: Array<UpdateOperation>,
    context: ExecutionContext
  ): Promise<Consumable<Bindings>> {
    const results = [];
    for (const update of updates) {
      results.push(await this.executeUpdate(update, context));
    }
    return new ManyConsumers(results);
  }

  private async executeUpdate(
    update: UpdateOperation,
    context: ExecutionContext
  ): Promise<Consumable<Bindings>> {
    if ("updateType" in update) {
      switch (update.updateType) {
        case "insert":
        case "delete":
        case "insertdelete":
          return this._handleInsertDelete(update, context);
        default:
          return new ErrorConsumable(
            `Unsupported SPARQL UPDATE query: ${update.updateType}`
          );
      }
    } else if ("type" in update) {
      switch (update.type) {
        case "create": {
          const createNode = update;
          const iri = createNode.graph.name ? createNode.graph.name : undefined;
          if (!iri) {
            return new NoopConsumer();
          }
          if (this._dataset.hasNamedGraph(iri)) {
            if (!createNode.silent) {
              return new ErrorConsumable(
                `Cannot create the Graph with iri ${iri} as it already exists in the RDF dataset`
              );
            }
            return new NoopConsumer();
          }
          return new ActionConsumer(async () => {
            this._dataset.addNamedGraph(await this._dataset.createGraph(iri));
          });
        }
        case "drop": {
          const dropNode = update;
          // handle DROP DEFAULT queries
          if ("default" in dropNode.graph && dropNode.graph.default) {
            return new ActionConsumer(() => {
              const defaultGraphIRI = this._dataset.getDefaultGraph().iri;
              if (this._dataset.iris.length < 1) {
                return new ErrorConsumable(
                  `Cannot drop the default Graph with iri ${iri} as it would leaves the RDF dataset empty without a default graph`
                );
              }
              const newDefaultGraphIRI = this._dataset.iris.find(
                (iri) => !iri.equals(defaultGraphIRI)
              )!;
              this._dataset.setDefaultGraph(
                this._dataset.getNamedGraph(newDefaultGraphIRI)
              );
            });
          }
          // handle DROP ALL queries
          if ("all" in dropNode.graph && dropNode.graph.all) {
            return new ActionConsumer(() => {
              this._dataset.iris.forEach((iri) =>
                this._dataset.deleteNamedGraph(iri)
              );
            });
          }
          // handle DROP GRAPH queries
          const iri = dropNode.graph.name;
          if (!iri) {
            return new NoopConsumer();
          }
          if (!this._dataset.hasNamedGraph(iri)) {
            if (!dropNode.silent) {
              return new ErrorConsumable(
                `Cannot drop the Graph with iri ${iri} as it doesn't exists in the RDF dataset`
              );
            }
            return new NoopConsumer();
          }
          return new ActionConsumer(() => {
            this._dataset.deleteNamedGraph(iri);
          });
        }
        case "clear":
          return this._handleClearQuery(update);
        case "add":
          return this._handleInsertDelete(
            rewriteAdd(update, this._dataset),
            context
          );
        case "copy": {
          // A COPY query is rewritten into a sequence [CLEAR query, INSERT query]
          const queries = rewriteCopy(update, this._dataset);
          return new ManyConsumers([
            this._handleClearQuery(queries[0]),
            await this._handleInsertDelete(queries[1], context),
          ]);
        }
        case "move": {
          // A MOVE query is rewritten into a sequence [CLEAR query, INSERT query, CLEAR query]
          const queries = rewriteMove(update, this._dataset);
          return new ManyConsumers([
            this._handleClearQuery(queries[0]),
            await this._handleInsertDelete(queries[1], context),
            this._handleClearQuery(queries[2]),
          ]);
        }
        default:
          return new ErrorConsumable(
            `Unsupported SPARQL UPDATE query: ${update.type}`
          );
      }
    }
    return new ErrorConsumable(`Unsupported SPARQL UPDATE query: ${update}`);
  }

  /**
   * Build a Consumer to evaluate SPARQL UPDATE queries
   * @private
   * @param update  - Parsed query
   * @param options - Execution options
   * @return A Consumer used to evaluate SPARQL UPDATE queries
   */
  async _handleInsertDelete(
    update: InsertDeleteOperation,
    context: ExecutionContext
  ): Promise<Consumable<Bindings>> {
    const engine = Pipeline.getInstance();
    let source: PipelineStage<Bindings> = engine.of(new BindingBase());
    let graph: Graph | null = null;
    let consumables: Consumable<Bindings>[] = [];

    if (update.updateType === "insertdelete") {
      graph =
        "graph" in update && update.graph
          ? this._dataset.getNamedGraph(update.graph)
          : null;
      // evaluate the WHERE clause as a classic SELECT query
      const node: Query = {
        prefixes: context.getProperty(ContextSymbols.PREFIXES),
        type: "query",
        where: update.where!,
        queryType: "SELECT",
        variables: [new Wildcard()],
        // copy the FROM clause from the original UPDATE query
        from: update.using,
      };
      source = await this._builder!._buildQueryPlan(node, context);
    }

    // clone the source first
    source = engine.clone(source);

    // build consumers to evaluate DELETE clauses
    if ("delete" in update && update.delete!.length > 0) {
      consumables = consumables.concat(
        update.delete!.map((v) => {
          return this._buildDeleteConsumer(source, v, graph);
        })
      );
    }

    // build consumers to evaluate INSERT clauses
    if ("insert" in update && update.insert!.length > 0) {
      consumables = consumables.concat(
        update.insert!.map((v) => {
          return this._buildInsertConsumer(source, v, graph);
        })
      );
    }
    return new ManyConsumers(consumables);
  }

  /**
   * Build a consumer to evaluate a SPARQL INSERT clause
   * @private
   * @param source - Input {@link PipelineStage}
   * @param group - parsed SPARQL INSERT clause
   * @param graph - RDF Graph used to insert data
   * @return A consumer used to evaluate a SPARQL INSERT clause
   */
  _buildInsertConsumer(
    source: PipelineStage<Bindings>,
    group: BgpPattern | GraphQuads,
    graph: Graph | null
  ): InsertConsumer<Bindings> {
    const tripleSource = construct(source, { template: group.triples });
    if (!graph) {
      graph =
        group.type === "graph" && "name" in group
          ? this._dataset.getNamedGraph(group.name as IriTerm)
          : this._dataset.getDefaultGraph();
    }
    return new InsertConsumer(tripleSource, graph);
  }

  /**
   * Build a consumer to evaluate a SPARQL DELETE clause
   * @private
   * @param  source - Input {@link PipelineStage}
   * @param  group - parsed SPARQL DELETE clause
   * @param  graph - RDF Graph used to delete data
   * @return A consumer used to evaluate a SPARQL DELETE clause
   */
  _buildDeleteConsumer(
    source: PipelineStage<Bindings>,
    group: BgpPattern | GraphQuads,
    graph: Graph | null
  ): DeleteConsumer<Bindings> {
    const tripleSource = construct(source, { template: group.triples });
    if (!graph) {
      graph =
        group.type === "graph" && "name" in group
          ? this._dataset.getNamedGraph(group.name as IriTerm)
          : this._dataset.getDefaultGraph();
    }
    return new DeleteConsumer(tripleSource, graph);
  }

  /**
   * Build a Consumer to evaluate CLEAR queries
   * @private
   * @param query - Parsed query
   * @return A Consumer used to evaluate CLEAR queries
   */
  _handleClearQuery(query: ClearDropOperation): ClearConsumer<Bindings> {
    let graph = null;
    const iris = this._dataset.iris;
    if (query.graph.default) {
      graph = this._dataset.getDefaultGraph();
    } else if (query.graph.all) {
      graph = this._dataset.getUnionGraph(iris, true);
    } else if (query.graph.named) {
      graph = this._dataset.getUnionGraph(iris, false);
    } else {
      graph = this._dataset.getNamedGraph(query.graph.name!);
    }
    return new ClearConsumer(graph);
  }
}

// SPDX-License-Identifier: MIT
import { isNull, mean, orderBy, round, sortBy } from "lodash-es";
import type { IriTerm, VariableTerm } from "sparqljs";
import ExecutionContext from "../engine/context/execution-context.ts";
import type {
  PipelineInput,
  PipelineStage,
} from "../engine/pipeline/pipeline-engine.ts";
import { Pipeline } from "../engine/pipeline/pipeline.ts";
import indexJoin from "../operators/join/index-join.ts";
import type { EngineTriple } from "../types.ts";
import { countVariables, dataFactory } from "../utils/rdf.ts";
import { leftLinearJoinOrdering } from "../utils/sparql.ts";
import { BindingBase, Bindings } from "./bindings.ts";
import { GRAPH_CAPABILITY, type GraphCapability } from "./graph_capability.ts";

/**
 * Metadata used for query optimization
 */
export interface PatternMetadata {
  triple: EngineTriple;
  cardinality: number;
  nbVars: number;
}

function parseCapabilities(
  registry: Map<GraphCapability, boolean>,
  proto: any
): void {
  registry.set(
    GRAPH_CAPABILITY.ESTIMATE_TRIPLE_CARD,
    proto.estimateCardinality != null
  );
  registry.set(GRAPH_CAPABILITY.UNION, proto.evalUnion != null);
}

/**
 * An abstract RDF Graph, accessed through a RDF Dataset
 * @abstract
 */
export default abstract class Graph {
  private _iri: IriTerm;
  private _capabilities: Map<GraphCapability, boolean>;

  constructor() {
    this._iri = dataFactory.namedNode("");
    this._capabilities = new Map();
    parseCapabilities(this._capabilities, Object.getPrototypeOf(this));
  }

  /**
   * Get the IRI of the Graph
   * @return The IRI of the Graph
   */
  get iri(): IriTerm {
    return this._iri;
  }

  /**
   * Set the IRI of the Graph
   * @param value - The new IRI of the Graph
   */
  set iri(value: IriTerm) {
    this._iri = value;
  }

  /**
   * Test if a graph has a capability
   * @param  token - Capability tested
   * @return True if the graph has the reuqested capability, false otherwise
   */
  _isCapable(token: GraphCapability): boolean {
    return this._capabilities.has(token) && this._capabilities.get(token)!;
  }

  /**
   * Insert a RDF triple into the RDF Graph
   * @param  triple - RDF Triple to insert
   * @return A Promise fulfilled when the insertion has been completed
   */
  abstract insert(triple: EngineTriple): Promise<void>;

  /**
   * Delete a RDF triple from the RDF Graph
   * @param  triple - RDF Triple to delete
   * @return A Promise fulfilled when the deletion has been completed
   */
  abstract delete(triple: EngineTriple): Promise<void>;

  /**
   * Get a {@link PipelineInput} which finds RDF triples matching a triple pattern in the graph.
   * @param pattern - Triple pattern to find
   * @param context - Execution options
   * @return A {@link PipelineInput} which finds RDF triples matching a triple pattern
   */
  abstract find(
    pattern: EngineTriple,
    context: ExecutionContext
  ): PipelineInput<EngineTriple>;

  /**
   * Remove all RDF triples in the Graph
   * @return A Promise fulfilled when the clear operation has been completed
   */
  abstract clear(): Promise<void>;

  /**
   * Estimate the cardinality of a Triple pattern, i.e., the number of matching RDF Triples in the RDF Graph.
   * @param  triple - Triple pattern to estimate cardinality
   * @return A Promise fulfilled with the pattern's estimated cardinality
   */
  estimateCardinality(triple: EngineTriple): Promise<number> {
    throw new SyntaxError(
      "Error: this graph is not capable of estimating the cardinality of a triple pattern"
    );
  }

  /**
   * Get a {@link PipelineStage} which finds RDF triples matching a triple pattern and a set of keywords in the RDF Graph.
   * The search can be constrained by min and max relevance (a 0 to 1 score signifying how closely the literal matches the search terms).
   *
   * The {@link Graph} class provides a default implementation that computes the relevance
   * score as the percentage of words matching the list of input keywords.
   * If the minRank and/or maxRanks parameters are used, then
   * the graph materializes all matching RDF triples, sort them by descending rank and then
   * selects the appropriates ranks.
   * Otherwise, the rank is not computed and all triples are associated with a rank of -1.
   *
   * Consequently, the default implementation should works fines for a basic usage, but more advanced users
   * should provides their own implementation, integrated with their own backend.
   * For example, a SQL-based RDF Graph should rely on GIN or GIST indexes for the full text search.
   * @param pattern - Triple pattern to find
   * @param variable - SPARQL variable on which the keyword search is performed
   * @param keywords - List of keywords to seach for occurence
   * @param matchAll - True if only values that contain all of the specified search terms should be considered.
   * @param minRelevance - Minimum relevance score (set it to null to disable it)
   * @param maxRelevance - Maximum relevance score (set it to null to disable it)
   * @param minRank - Minimum rank of the matches (set it to null to disable it)
   * @param maxRank - Maximum rank of the matches (set it to null to disable it)
   * @param context - Execution options
   * @return A {@link PipelineInput} which output tuples of shape [matching RDF triple, score, rank].
   */
  fullTextSearch(
    pattern: EngineTriple,
    variable: VariableTerm,
    keywords: string[],
    matchAll: boolean,
    minRelevance: number | null,
    maxRelevance: number | null,
    minRank: number | null,
    maxRank: number | null,
    context: ExecutionContext
  ): PipelineStage<[EngineTriple, number, number]> {
    if (isNull(minRelevance)) {
      minRelevance = 0;
    }
    if (isNull(maxRelevance)) {
      maxRelevance = Number.MAX_SAFE_INTEGER;
    }
    // find all RDF triples matching the input triple pattern
    const source = Pipeline.getInstance().from(this.find(pattern, context));
    // compute the score of each matching RDF triple as the average number of words
    // in the RDF term that matches kewyords
    let iterator = Pipeline.getInstance().map(source, (triple) => {
      let words: string[] = [];
      if (pattern.subject.equals(variable)) {
        words = triple.subject.value.split(" ");
      } else if (pattern.predicate.equals(variable)) {
        words = triple.predicate.value.split(" ");
      } else if (pattern.object.equals(variable)) {
        words = triple.object.value.split(" ");
      }
      // For each keyword, compute % of words matching the keyword
      const keywordScores = keywords.map((keyword) => {
        return (
          words.reduce((acc, word) => {
            if (word.includes(keyword)) {
              acc += 1;
            }
            return acc;
          }, 0) / words.length
        );
      });
      // if we should match all keyword, not matching a single keyword gives you a score of 0
      if (matchAll && keywordScores.some((v) => v === 0)) {
        return { triple, rank: -1, score: 0 };
      }
      // The relevance score is computed as the average keyword score
      return { triple, rank: -1, score: round(mean(keywordScores), 3) };
    });
    // filter by min & max relevance scores
    iterator = Pipeline.getInstance().filter(iterator, (v) => {
      return (
        v.score > 0 && minRelevance! <= v.score && v.score <= maxRelevance!
      );
    });
    // if needed, rank the matches by descending score
    if (!isNull(minRank) || !isNull(maxRank)) {
      if (isNull(minRank)) {
        minRank = 0;
      }
      if (isNull(maxRank)) {
        maxRank = Number.MAX_SAFE_INTEGER;
      }
      // null or negative values for minRank and/or maxRank will yield no results
      if (minRank < 0 || maxRank < 0) {
        return Pipeline.getInstance().empty();
      }
      // ranks the matches, and then only keeps the desired ranks
      iterator = Pipeline.getInstance().flatMap(
        Pipeline.getInstance().collect(iterator),
        (values) => {
          return (
            orderBy(values, ["score"], ["desc"])
              // add rank
              .map((item, rank) => {
                item.rank = rank;
                return item;
              })
              // slice using the minRank and maxRank parameters
              .slice(minRank!, maxRank! + 1)
          );
        }
      );
    }
    // finally, format results as tuples [RDF triple, triple's score, triple's rank]
    return Pipeline.getInstance().map(iterator, (v) => [
      v.triple,
      v.score,
      v.rank,
    ]);
  }

  /**
   * Evaluates an union of Basic Graph patterns on the Graph using a {@link PipelineStage}.
   * @param  patterns - The set of BGPs to evaluate
   * @param  context - Execution options
   * @return A {@link PipelineStage} which evaluates the Basic Graph pattern on the Graph
   */
  evalUnion(
    patterns: EngineTriple[][],
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    throw new SyntaxError(
      "Error: this graph is not capable of evaluating UNION queries"
    );
  }

  /**
   * Evaluates a Basic Graph pattern, i.e., a set of triple patterns, on the Graph using a {@link PipelineStage}.
   * @param  bgp - The set of triple patterns to evaluate
   * @param  context - Execution options
   * @return A {@link PipelineStage} which evaluates the Basic Graph pattern on the Graph
   */
  evalBGP(
    bgp: EngineTriple[],
    context: ExecutionContext
  ): PipelineStage<Bindings> {
    const engine = Pipeline.getInstance();
    if (this._isCapable(GRAPH_CAPABILITY.ESTIMATE_TRIPLE_CARD)) {
      const op = engine.from(
        Promise.all(
          bgp.map((triple) => {
            return this.estimateCardinality(triple).then((c) => {
              return {
                triple,
                cardinality: c,
                nbVars: countVariables(triple),
              };
            });
          })
        )
      );
      return engine.mergeMap(op, (results: PatternMetadata[]) => {
        const sortedPatterns = leftLinearJoinOrdering(
          sortBy(results, "cardinality").map((t) => t.triple)
        );
        const start = engine.of(new BindingBase());
        return sortedPatterns.reduce(
          (iter: PipelineStage<Bindings>, t: EngineTriple) => {
            return indexJoin(iter, t, this, context);
          },
          start
        );
      });
    } else {
      // FIX ME: this trick is required, otherwise ADD, COPY and MOVE queries are not evaluated correctly. We need to find why...
      return engine.mergeMap(engine.from(Promise.resolve(null)), () => {
        const start = engine.of(new BindingBase());
        return leftLinearJoinOrdering(bgp).reduce(
          (iter: PipelineStage<Bindings>, t: EngineTriple) => {
            return indexJoin(iter, t, this, context);
          },
          start
        );
      });
    }
  }
}

// disable optional methods
Object.defineProperty(Graph.prototype, "estimateCardinality", { value: null });
Object.defineProperty(Graph.prototype, "evalUnion", { value: null });

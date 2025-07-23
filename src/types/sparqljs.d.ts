/* file : sparqljs/index.d.ts
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

/**
 * A parser for the SPARQL query language in JavaScript
 * @author Ruben Verborgh
 * @see https://github.com/RubenVerborgh/SPARQL.js
 */
declare module 'sparqljs' {
  /**
   * All the interfaces that compose the algebra of the SPARQL query language
   * @see https://www.w3.org/TR/sparql11-query
   */
  export namespace Algebra {
    /**
    * A Triple pattern in Object format
    * @see https://www.w3.org/TR/sparql11-query/#QSynTriples
    */
    export interface TripleObject {
      /**
       * The triple subject: a RDF URI or a SPARQL variable.
       */
      subject: string;
      /**
       * The triple predicate: a RDF URI or a SPARQL variable.
       */
      predicate: string;
      /**
       * The triple predicate: a RDF URI, a RDF Literal or a SPARQL variable.
       */
      object: string;
      /**
       * The triple graph: a RDF URI or a SPARQL variable.
       */
      graph?: string;
    }

    /**
    * A Triple pattern in Object format with property path(s)
    * @see https://www.w3.org/TR/sparql11-query/#propertypaths
    */
    export interface PathTripleObject {
      /**
       * The triple subject: a RDF URI or a SPARQL variable.
       */
      subject: string;
      /**
       * The triple property path
       */
      predicate: PropertyPath;
      /**
       * The triple predicate: a RDF URI, a RDF Literal or a SPARQL variable.
       */
      object: string;
      /**
       * The triple graph: a RDF URI or a SPARQL variable.
       */
      graph?: string;
    }

    /**
    * A generic node in a parsed plan
    */
    export interface PlanNode {
      /**
       * The type of the node
       */
      type: string;
    }

    /**
     * A Property path
     * @see https://www.w3.org/TR/sparql11-query/#propertypaths
     */
    export interface PropertyPath extends PlanNode {
      /**
       * Content of the property path: a sequence of RDF variable and/or other property paths.
       */
      items: Array<string | PropertyPath>;
      /**
       * The type of proprty path
       */
      pathType: '/' | '|' | '+' | '?' | '*' | '!' | '^' | 'symbol';
    }

    /**
     * An abstract (SPARQL) expression
     */
    export interface Expression {
      /**
       * The type of the expression
       */
      type: string;
    }

    /**
     * A SPARQL expression (=, <, +, -, LANG, BOUND, etc)
     * @see https://www.w3.org/TR/sparql11-query/#expressions
     */
    export interface SPARQLExpression extends Expression {
      /**
       * THe arguments of the SPARQL expression. They can also be SPARQL expressions.
       */
      args: Array<string | string[] | Expression>;
      /**
       * The operator (=, <, +, -, LANG, BOUND, etc) of the expression
       */
      operator: string;
    }

    /**
     * A custom function expression, e.g., BIND(foo:FOO(?s) as ?foo)).
     * @see https://www.w3.org/TR/sparql11-query/#expressions
     */
    export interface FunctionCallExpression extends Expression {
      /**
       * The arguments of the custom SPARQL function call. They can also be SPARQL expressions.
       */
      args: Array<string | string[] | Expression>;
      /**
       * The function's name
       */
      function: string;
      /**
       * Wether the function is using the DISTINCT modifier or not
       */
      distinct: boolean;
    }

    /**
     * An aggregation pexression (COUNT, SUM, AVG, etc)
     * @see https://www.w3.org/TR/sparql11-query/#aggregates
     */
    export interface AggregateExpression extends Expression {
      aggregation: string;
      expression: string | Expression;
      separator?: string;
      distinct: boolean;
    }

    /**
     * A SPARQL aggregation, which bounds an aggregation to a SPARQL variable
     * @see https://www.w3.org/TR/sparql11-query/#aggregates
     */
    export interface Aggregation {
      variable: string;
      expression: Expression;
    }

    /**
     * The FROM clause of a SPARQL query
     * @see https://www.w3.org/TR/sparql11-query/#specifyingDataset
     */
    export interface FromNode {
      default: string[];
      named: string[];
    }

    /**
     * A comprator, as specified in an ORDER BY clause
     * @see https://www.w3.org/TR/sparql11-query/#modOrderBy
     */
    export interface OrderComparator {
      expression: string,
      ascending?: boolean,
      descending?: boolean
    }

    /**
     * The root node of a SPARQL 1.1 SELECT/ASK/CONSTRUCT/DESCRIBE query
     */
    export interface RootNode extends PlanNode {
      /**
       * Prefixes declared in the query preambule
       * @see https://www.w3.org/TR/sparql11-query/#prefNames
       */
      prefixes: { [prefix: string]: string; };
      /**
       * The type of the query
       */
      queryType: string;
      /**
       * If the query use a DISTINCT modifier
       * @see https://www.w3.org/TR/sparql11-query/#modDuplicates
       */
      distinct?: boolean;
      /**
       * Projection variables and/or aggregation expressions in the SELECT clause of the query
       * @see https://www.w3.org/TR/sparql11-query/#select
       */
      variables?: Array<string | Aggregation>;
      /**
       * For CONSTRUCT queries, the set of templates in the CONSTRUCT clause
       * @see https://www.w3.org/TR/sparql11-query/#construct
       */
      template?: TripleObject[];
      /**
       * The FROM clause of the query
       * @see https://www.w3.org/TR/sparql11-query/#specifyingDataset
       */
      from?: FromNode;
      /**
       * The WHERE clause of the query
       */
      where: Array<PlanNode>;
      /**
       * The GROUP BY clause of the query
       * @see https://www.w3.org/TR/sparql11-query/#groupby
       */
      group?: Array<Aggregation>;
      /**
       * The HAVING clause of the query
       * @see https://www.w3.org/TR/sparql11-query/#having
       */
      having?: Array<Expression>;
      /**
       * The ORDER BY clause of the query
       * @see https://www.w3.org/TR/sparql11-query/#modOrderBy
       */
      order?: Array<OrderComparator>;
      /**
       * The OFFSET value of the query
       * @see https://www.w3.org/TR/sparql11-query/#modOffset
       */
      offset?: number;
      /**
       * The LIMIT value of the query
       * @see https://www.w3.org/TR/sparql11-query/#modResultLimit
       */
      limit?: number;
    }

    /**
     * Root of a SPARQL 1.1 UPDATE query
     * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/
     */
    export interface UpdateRootNode extends PlanNode {
      /**
       * Prefixes declared in the query preambule
       * @see https://www.w3.org/TR/sparql11-query/#prefNames
       */
      prefixes: { [prefix: string]: string; };
      /**
       * The set of update nodes in the query
       */
      updates: Array<UpdateQueryNode | UpdateCopyMoveNode>
    }

    /**
     * A SPARQL DELETE/INSERT node
     * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#graphUpdate
     */
    export interface UpdateQueryNode {
      /**
       * THe type of the query
       */
      updateType: 'insert' | 'delete' | 'insertdelete';
      /**
       * If the query should fail silently
       */
      silent?: boolean;
      /**
       * The RDF Graph on which the update is applied
       */
      graph?: string;
      /**
       * The FROM clause of the query
       * @see https://www.w3.org/TR/sparql11-query/#specifyingDataset
       */
      from?: FromNode;
      /**
       * The set of insert operations performed by the query.
       * Empty for DELETE DATA queries.
       */
      insert?: Array<BGPNode | UpdateGraphNode>;
      /**
       * The set of delete operations performed by the query.
       * Empty for INSERT DATA queries.
       */
      delete?: Array<BGPNode | UpdateGraphNode>;
      /**
       * The WHERE clause of the query
       */
      where?: Array<PlanNode>;
    }

    /**
     * A SPARQL COPY/MOVE/ADD node
     * @see https://www.w3.org/TR/2013/REC-sparql11-update-20130321/#graphManagement
     */
    export interface UpdateCopyMoveNode extends PlanNode {
      /**
       * Destination's graph of the COPY/MOVE operation
       */
      destination: UpdateGraphTarget;
      /**
       * Source's graph of the COPY/MOVE operation
       */
      source: UpdateGraphTarget;
      /**
       * If the query should fail silently
       */
      silent: boolean;
    }

    /**
     * A SPARQL CREATE node
     */
    export interface UpdateCreateDropNode extends PlanNode {
      /**
       * If the query should fail silently
       */
      silent: boolean;
      /**
       * The RDF graph(s) on which the operation is applied
       */
      graph: {
        /**
         * If the operation is applied on the default RDF Graph
         */
        default?: boolean;
        /**
         * If the operation is applied on the whole RDF dataset, i.e., all RDF graphs
         */
        all?: boolean;
        /**
         * The type of graph
         */
        type: string;
        /**
         * The URI of the graph
         */
        name: string;
      };
    }

    /**
     * A SPARQL CLEAR node
     */
    export interface UpdateClearNode extends PlanNode {
      /**
       * If the query should fail silently
       */
      silent: boolean;
      /**
       * The RDF Graph to clear
       */
      graph: UpdateClearTarget;
    }

    /**
     * The source or destination of a SPARQL COPY/MOVE/ADD query
     */
    export interface UpdateGraphTarget extends PlanNode {
      /**
       * If the Graph is the default RDF graph of the dataset
       */
      default?: boolean;
      /**
       * The URI of the graph
       */
      name?: string;
    }

    /**
     * The source or destination of a SPARQL CLEAR query
     */
    export interface UpdateClearTarget extends UpdateGraphTarget {
      /**
       * The URI of the graph
       */
      named?: string;
      /**
       * If the operation is applied on the whole RDF dataset, i.e., all RDF graphs
       */
      all?: boolean;
    }

    /**
     * A GRAPH Node as found in a SPARQL 1.1 UPDATE query
     */
    export interface UpdateGraphNode extends PlanNode {
      /**
       * The URI of the graph
       */
      name: string;
      /**
       * The triple patterns in the GRAPH clause
       */
      triples: Array<TripleObject>
    }

    /**
    * A SPARQL Basic Graph pattern
    */
    export interface BGPNode extends PlanNode {
      /**
      * The triple patterns of the BGP
      */
      triples: Array<TripleObject | PathTripleObject>;
    }

    /**
    * A SPARQL Group, i.e., a union, optional or neutral group
    */
    export interface GroupNode extends PlanNode {
      /**
      * Group's patterns
      */
      patterns: Array<PlanNode>;
    }

    /**
    * A SPARQL FILTER clause
    */
    export interface FilterNode extends PlanNode {
      /**
       * The SPARQL expression of the FILTER clause
       */
      expression: SPARQLExpression;
    }

    /**
    * A SPARQL GRAPH clause
    */
    export interface GraphNode extends GroupNode {
      /**
      * The URI of the RDF Graph
      */
      name: string;
    }

    /**
    * A SPARQL SERVICE clause
    */
    export interface ServiceNode extends GraphNode {
      /**
      * True if the SERVICE must be silent, False otherwise
      */
      silent: boolean;
    }

    /**
     * A SPARQL BIND node
     */
    export interface BindNode extends PlanNode {
      /**
       * The SPARQL expression evaluated by the BIND clause
       */
      expression: string | SPARQLExpression;
      /**
       * The SPARQL variable on which results are binded
       */
      variable: string;
    }

    /**
     * A SPARQL VALUES node
     */
    export interface ValuesNode extends PlanNode {
      /**
       * The content of the VALUES node
       */
      values: any[]
    }
  }

  /**
   * Compile SPARQL queries from their string representation to logical query execution plans
   */
  export class Parser {
    constructor(prefixes?: any)
    /**
     * Parse a SPARQL query into a logical query execution plan
     * @param query - SPARQL query in string format
     * @return Parsed SPARQL query
     */
    parse(query: string): Algebra.RootNode;
  }

  /**
   * Compile SPARQL queries from their logical query execution plans to string representations
   */
  export class Generator {
    /**
     * Compile a SPARQL query from its logical query execution to a string format
     * @param plan - A logical SPARQL query execution
     * @return The SPARQL query in string format
     */
    stringify(plan: Algebra.RootNode): string;
  }
}
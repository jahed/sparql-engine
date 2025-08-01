// SPDX-License-Identifier: MIT
import { isArray, merge, uniqBy } from "lodash-es";

import { termToString } from "rdf-string";
import type {
  AggregateExpression,
  Expression,
  FunctionCallExpression,
  OperationExpression,
} from "sparqljs";
import { Bindings } from "../../rdf/bindings.ts";
import type { EngineTripleValue } from "../../types.ts";
import { isVariable } from "../../utils/rdf.ts";
import type { Group } from "../sparql-groupby.ts";
import CUSTOM_AGGREGATES from "./custom-aggregates.ts";
import CUSTOM_OPERATIONS from "./custom-operations.ts";
import SPARQL_AGGREGATES from "./sparql-aggregates.ts";
import SPARQL_OPERATIONS from "./sparql-operations.ts";

type Term = EngineTripleValue;

/**
 * An input SPARQL expression to be compiled
 */
export type InputExpression = Expression | Term | Term[];

/**
 * The output of a SPARQL expression's evaluation, one of the following
 * * A RDFJS Term.
 * * An array of RDFJS Terms.
 * * An iterator that yields RDFJS Terms or null values.
 * * A `null` value, which indicates that the expression's evaluation has failed.
 */
export type ExpressionOutput = Term | Term[] | Iterable<Term | null> | null;

/**
 * A SPARQL expression compiled as a function
 */
export type CompiledExpression = (
  bindings: Bindings
) => Promise<ExpressionOutput>;

/**
 * Type alias to describe the shape of custom functions. It's basically a JSON object from an IRI (in string form) to a function of 0 to many RDFTerms that produces an RDFTerm.
 */
export type CustomFunctions = {
  [key: string]: (...args: (Term | Term[] | null)[]) => ExpressionOutput;
};

/**
 * Test if a SPARQL expression is a SPARQL operation
 * @param expr - SPARQL expression, in sparql.js format
 * @return True if the SPARQL expression is a SPARQL operation, False otherwise
 */
function isOperation(expr: Expression): expr is OperationExpression {
  return "operator" in expr;
}

/**
 * Test if a SPARQL expression is a SPARQL aggregation
 * @param expr - SPARQL expression, in sparql.js format
 * @return True if the SPARQL expression is a SPARQL aggregation, False otherwise
 */
function isAggregation(expr: Expression): expr is AggregateExpression {
  return "aggregation" in expr;
}

/**
 * Test if a SPARQL expression is a SPARQL function call (like a custom function)
 * @param expr - SPARQL expression, in sparql.js format
 * @return True if the SPARQL expression is a SPARQL function call, False otherwise
 */
function isFunctionCall(expr: Expression): expr is FunctionCallExpression {
  return "function" in expr;
}

/**
 * Compile and evaluate a SPARQL expression (found in FILTER clauses, for example)
 */
export class SPARQLExpression {
  private readonly _expression: CompiledExpression;

  /**
   * Constructor
   * @param expression - SPARQL expression
   */
  constructor(expression: InputExpression, customFunctions?: CustomFunctions) {
    // merge custom operations defined by the framework & by the user
    const customs = merge({}, CUSTOM_OPERATIONS, customFunctions);
    this._expression = this._compileExpression(expression, customs);
  }

  /**
   * Recursively compile a SPARQL expression into a function
   * @param  expression - SPARQL expression
   * @return Compiled SPARQL expression
   */
  private _compileExpression(
    expression: InputExpression,
    customFunctions: CustomFunctions
  ): CompiledExpression {
    // case 1: the expression is a SPARQL variable to bound or a RDF term
    if ("termType" in expression) {
      if (isVariable(expression)) {
        return async (bindings: Bindings) => {
          return bindings.get(expression.value);
        };
      }
      return async () => expression;
    } else if (isArray(expression)) {
      // case 2: the expression is a list of RDF terms
      // because IN and NOT IN expressions accept arrays as argument
      return async () => expression as Term[];
    } else if (isOperation(expression)) {
      // case 3: a SPARQL operation, so we recursively compile each argument
      // and then evaluate the expression
      const args = expression.args.map((arg) =>
        this._compileExpression(arg as Expression, customFunctions)
      );
      if (!(expression.operator in SPARQL_OPERATIONS)) {
        throw new Error(`Unsupported SPARQL operation: ${expression.operator}`);
      }
      const operation = SPARQL_OPERATIONS[
        expression.operator as keyof typeof SPARQL_OPERATIONS
      ] as (
        ...args: ExpressionOutput[]
      ) => ExpressionOutput | Promise<ExpressionOutput>;
      return async (bindings: Bindings) =>
        operation(...(await Promise.all(args.map((arg) => arg(bindings)))));
    } else if (isAggregation(expression)) {
      const aggVariable = expression.expression;
      // case 3: a SPARQL aggregation
      if (!(expression.aggregation in SPARQL_AGGREGATES)) {
        throw new Error(
          `Unsupported SPARQL aggregation: ${expression.aggregation}`
        );
      }
      if (!isVariable(aggVariable)) {
        throw new Error(
          `SPARQL aggregation expression must be a variable: ${aggVariable}`
        );
      }
      const aggregation =
        SPARQL_AGGREGATES[
          expression.aggregation as keyof typeof SPARQL_AGGREGATES
        ];
      return async (bindings: Bindings) => {
        if (bindings.hasProperty("__aggregate")) {
          let rows = bindings.getProperty("__aggregate") as Group;
          if (expression.distinct) {
            rows[aggVariable.value] = uniqBy(rows[aggVariable.value], (term) =>
              termToString(term)
            );
          }
          return aggregation(aggVariable, rows, expression.separator);
        }
        throw new SyntaxError(
          `SPARQL aggregation error: you are trying to use the ${expression.aggregation} SPARQL aggregate outside of an aggregation query.`
        );
      };
    } else if (isFunctionCall(expression)) {
      // last case: the expression is a custom function
      let customFunction: any;
      let isAggregate = false;
      const functionName =
        typeof expression.function === "string"
          ? expression.function
          : termToString(expression.function);
      // custom aggregations defined by the framework
      const functionNameLower = functionName.toLowerCase();
      if (functionNameLower in CUSTOM_AGGREGATES) {
        isAggregate = true;
        customFunction =
          CUSTOM_AGGREGATES[
            functionNameLower as keyof typeof CUSTOM_AGGREGATES
          ];
      } else if (functionName in customFunctions) {
        // custom operations defined by the user & the framework
        customFunction = customFunctions[functionName];
      } else {
        throw new SyntaxError(
          `Custom function could not be found: ${functionName}`
        );
      }
      if (isAggregate) {
        return async (bindings: Bindings) => {
          if (bindings.hasProperty("__aggregate")) {
            const rows = bindings.getProperty("__aggregate");
            return customFunction(...expression.args, rows);
          }
          throw new SyntaxError(
            `SPARQL aggregation error: you are trying to use the ${functionName} SPARQL aggregate outside of an aggregation query.`
          );
        };
      }
      return async (bindings: Bindings) => {
        try {
          const args = expression.args.map((args) =>
            this._compileExpression(args, customFunctions)
          );
          return customFunction(
            ...(await Promise.all(args.map((arg) => arg(bindings))))
          );
        } catch (e) {
          // In section 10 of the sparql docs (https://www.w3.org/TR/sparql11-query/#assignment) it states:
          // "If the evaluation of the expression produces an error, the variable remains unbound for that solution but the query evaluation continues."
          // unfortunately this means the error is silent unless some logging is introduced here,
          // which is probably not desired unless a logging framework is introduced
          return null;
        }
      };
    }
    console.log({ expression });
    throw new Error(`Unsupported SPARQL operation type.`);
  }

  /**
   * Evaluate the expression using a set of mappings
   * @param  bindings - Set of mappings
   * @return Results of the evaluation
   */
  async evaluate(bindings: Bindings): Promise<ExpressionOutput> {
    return this._expression(bindings);
  }
}

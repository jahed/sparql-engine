// SPDX-License-Identifier: MIT
import { maxBy, meanBy, minBy, sample } from "lodash-es";

import type { VariableTerm } from "sparqljs";
import type { EngineTripleValue } from "../../types.ts";
import {
  asJS,
  createInteger,
  literalIsNumeric,
  RDF,
  termIsLiteral,
} from "../../utils/rdf.ts";

type Term = EngineTripleValue;

type TermRows = { [key: string]: Term[] };

/**
 * SPARQL Aggregation operations.
 * Each operation takes an arguments a SPARQL variable and a row of bindings, i.e., a list of
 * solutions bindings on which the aggregation must be applied.
 * Each operations is expected to return a term, as with classic SPARQL operations
 * @see https://www.w3.org/TR/sparql11-query/#aggregateAlgebra
 */
export default {
  count: function (variable: VariableTerm, rows: TermRows): Term {
    let count: number = 0;
    if (variable.value in rows) {
      count = rows[variable.value].map((v: Term) => v !== null).length;
    }
    return createInteger(count);
  },
  sum: function (variable: VariableTerm, rows: TermRows): Term {
    let sum = 0;
    if (variable.value in rows) {
      sum = rows[variable.value].reduce((acc: number, b: Term) => {
        if (termIsLiteral(b) && literalIsNumeric(b)) {
          return acc + asJS(b.value, b.datatype.value);
        }
        return acc;
      }, 0);
    }
    return createInteger(sum);
  },

  avg: function (variable: VariableTerm, rows: TermRows): Term {
    let avg = 0;
    if (variable.value in rows) {
      avg = meanBy(rows[variable.value], (term: Term) => {
        if (termIsLiteral(term) && literalIsNumeric(term)) {
          return asJS(term.value, term.datatype.value);
        }
      });
    }
    return createInteger(avg);
  },

  min: function (variable: VariableTerm, rows: TermRows): Term {
    return (
      minBy(rows[variable.value], (v: Term) => {
        if (termIsLiteral(v)) {
          return asJS(v.value, v.datatype.value);
        }
        return v.value;
      }) || createInteger(-1)
    );
  },

  max: function (variable: VariableTerm, rows: TermRows): Term {
    return (
      maxBy(rows[variable.value], (v: Term) => {
        if (termIsLiteral(v)) {
          return asJS(v.value, v.datatype.value);
        }
        return v.value;
      }) || createInteger(-1)
    );
  },

  group_concat: function (
    variable: VariableTerm,
    rows: TermRows,
    sep: string = ""
  ): Term {
    const value = rows[variable.value].map((v: Term) => v.value).join(sep);
    return RDF.literal(value);
  },

  sample: function (variable: VariableTerm, rows: TermRows): Term {
    return sample(rows[variable.value])!;
  },
};

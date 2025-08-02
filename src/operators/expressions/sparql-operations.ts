// SPDX-License-Identifier: MIT
import {
  addMilliseconds,
  isAfter,
  isBefore,
  isEqual,
  subMilliseconds,
} from "date-fns";
import { isNull } from "lodash-es";
import type { EngineTripleValue } from "../../types.ts";
import { parseISO8601 } from "../../utils/date.ts";
import {
  asJS,
  createBoolean,
  createDate,
  createDecimal,
  createInteger,
  createLangLiteral,
  createTypedLiteral,
  dataFactory,
  literalIsBoolean,
  literalIsDate,
  literalIsNumeric,
  shallowCloneTerm,
  termIsBNode,
  termIsIRI,
  termIsLiteral,
  UNBOUND,
  XSD_integer,
} from "../../utils/rdf.ts";

type Term = EngineTripleValue;

function digestOperation(hashType: string): (v: Term) => Promise<Term> {
  return async (v) => {
    return dataFactory.literal(
      toHex(
        await crypto.subtle.digest(hashType, new TextEncoder().encode(v.value))
      )
    );
  };
}

function toHex(buffer: ArrayBuffer): string {
  const result: string[] = [];
  for (const byte of new Uint8Array(buffer)) {
    result.push(byte.toString(16).padStart(2, "0"));
  }
  return result.join("");
}

/**
 * Implementation of SPARQL operations found in FILTERS
 * All arguments are pre-compiled from string to an intermediate representation.
 * All possible intermediate representation are gathered in the `src/rdf-terms.js` file,
 * and are used to represents RDF Terms.
 * Each SPARQL operation is also expected to return the same kind of intermediate representation.
 */
export default {
  /*
    COALESCE function https://www.w3.org/TR/sparql11-query/#func-coalesce
  */
  coalesce: function (baseValue: Term | null, defaultValue: Term | null): Term {
    if (!isNull(baseValue)) {
      return baseValue;
    } else if (!isNull(defaultValue)) {
      return defaultValue;
    }
    return UNBOUND;
  },

  /*
    IF function https://www.w3.org/TR/sparql11-query/#func-if
  */
  if: function (
    booleanValue: Term | null,
    valueIfTrue: Term | null,
    valueIfFalse: Term | null
  ): Term {
    if (isNull(booleanValue) || isNull(valueIfTrue) || isNull(valueIfFalse)) {
      throw new SyntaxError(
        `SPARQL expression error: some arguments of an IF function are unbound. Got IF(${booleanValue}, ${valueIfTrue}, ${valueIfFalse})`
      );
    }
    if (
      termIsLiteral(booleanValue) &&
      (literalIsBoolean(booleanValue) || literalIsNumeric(booleanValue))
    ) {
      return asJS(booleanValue.value, booleanValue.datatype.value)
        ? valueIfTrue
        : valueIfFalse;
    }
    throw new SyntaxError(
      `SPARQL expression error: you are using an IF function whose first argument is expected to be a boolean, but instead got ${booleanValue}`
    );
  },

  /*
    XQuery & XPath functions https://www.w3.org/TR/sparql11-query/#OperatorMapping
  */
  "+": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createDate(addMilliseconds(valueA, valueB.getTime()));
      }
      return createTypedLiteral(valueA + valueB, a.datatype.value);
    }
    return dataFactory.literal(asJS(a.value, null) + asJS(b.value, null));
  },

  "-": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createDate(subMilliseconds(valueA, valueB.getTime()));
      }
      return createTypedLiteral(valueA - valueB, a.datatype.value);
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot substract non-Literals ${a} and ${b}`
    );
  },

  "*": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createDate(new Date(valueA.getTime() * valueB.getTime()));
      }
      return createTypedLiteral(valueA * valueB, a.datatype.value);
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot multiply non-Literals ${a} and ${b}`
    );
  },

  "/": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createDate(new Date(valueA.getTime() / valueB.getTime()));
      }
      return createTypedLiteral(valueA / valueB, a.datatype.value);
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot divide non-Literals ${a} and ${b}`
    );
  },

  "=": function (a: Term, b: Term): Term {
    return createBoolean(a.equals(b));
  },

  "!=": function (a: Term, b: Term): Term {
    return createBoolean(!a.equals(b));
  },

  "<": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createBoolean(isBefore(valueA, valueB));
      }
      return createBoolean(valueA < valueB);
    }
    return createBoolean(a.value < b.value);
  },

  "<=": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createBoolean(
          isEqual(valueA, valueB) || isBefore(valueA, valueB)
        );
      }
      return createBoolean(valueA <= valueB);
    }
    return createBoolean(a.value <= b.value);
  },

  ">": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createBoolean(isAfter(valueA, valueB));
      }
      return createBoolean(valueA > valueB);
    }
    return createBoolean(a.value > b.value);
  },

  ">=": function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      if (literalIsDate(a) && literalIsDate(b)) {
        return createBoolean(
          isEqual(valueA, valueB) || isAfter(valueA, valueB)
        );
      }
      return createBoolean(valueA >= valueB);
    }
    return createBoolean(a.value >= b.value);
  },

  "!": function (a: Term): Term {
    if (termIsLiteral(a) && literalIsBoolean(a)) {
      return createBoolean(!asJS(a.value, a.datatype.value));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the negation of a non boolean literal ${a}`
    );
  },

  "&&": function (a: Term, b: Term): Term {
    if (
      termIsLiteral(a) &&
      termIsLiteral(b) &&
      literalIsBoolean(a) &&
      literalIsBoolean(b)
    ) {
      return createBoolean(
        asJS(a.value, a.datatype.value) && asJS(b.value, b.datatype.value)
      );
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the conjunction of non boolean literals ${a} and ${b}`
    );
  },

  "||": function (a: Term, b: Term): Term {
    if (
      termIsLiteral(a) &&
      termIsLiteral(b) &&
      literalIsBoolean(a) &&
      literalIsBoolean(b)
    ) {
      return createBoolean(
        asJS(a.value, a.datatype.value) || asJS(b.value, b.datatype.value)
      );
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the disjunction of non boolean literals ${a} and ${b}`
    );
  },

  /*
    SPARQL Functional forms https://www.w3.org/TR/sparql11-query/#func-forms
  */
  bound: function (a: Term) {
    return createBoolean(!isNull(a));
  },

  sameterm: function (a: Term, b: Term): Term {
    return createBoolean(a.value === b.value);
  },

  in: function (a: Term, b: Term[]): Term {
    return createBoolean(b.some((elt) => a.equals(elt)));
  },

  notin: function (a: Term, b: Term[]): Term {
    return createBoolean(!b.some((elt) => a.equals(elt)));
  },

  /*
    Functions on RDF Terms https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  */

  isiri: function (a: Term): Term {
    return createBoolean(termIsIRI(a));
  },

  isblank: function (a: Term): Term {
    return createBoolean(termIsBNode(a));
  },

  isliteral: function (a: Term): Term {
    return createBoolean(termIsLiteral(a));
  },

  isnumeric: function (a: Term): Term {
    return createBoolean(termIsLiteral(a) && literalIsNumeric(a));
  },

  str: function (a: Term): Term {
    return dataFactory.literal(a.value);
  },

  lang: function (a: Term): Term {
    if (termIsLiteral(a)) {
      return dataFactory.literal(a.language.toLowerCase());
    }
    return dataFactory.literal("");
  },

  datatype: function (a: Term): Term {
    if (termIsLiteral(a)) {
      return a.datatype;
    }
    return dataFactory.literal("");
  },

  iri: function (a: Term): Term {
    return dataFactory.namedNode(a.value);
  },

  bnode: function (a?: Term): Term {
    if (a === undefined) {
      return dataFactory.blankNode();
    }
    return dataFactory.blankNode(a.value);
  },

  strdt: function (x: Term, datatype: Term): Term {
    return createTypedLiteral(x.value, datatype.value);
  },

  strlang: function (x: Term, lang: Term): Term {
    return createLangLiteral(x.value, lang.value);
  },

  uuid: function (): Term {
    return dataFactory.namedNode(`urn:uuid:${crypto.randomUUID()}`);
  },

  struuid: function (): Term {
    return dataFactory.literal(crypto.randomUUID());
  },

  /*
    Functions on Strings https://www.w3.org/TR/sparql11-query/#func-strings
  */

  strlen: function (a: Term): Term {
    return createInteger(a.value.length);
  },

  substr: function (str: Term, index: Term, length?: Term): Term {
    const indexValue = asJS(index.value, XSD_integer);
    if (indexValue < 1) {
      throw new SyntaxError(
        "SPARQL SUBSTR error: the index of the first character in a string is 1 (according to the SPARQL W3C specs)"
      );
    }
    let value = str.value.substring(indexValue - 1);
    if (length !== undefined) {
      const lengthValue = asJS(length.value, XSD_integer);
      value = value.substring(0, lengthValue);
    }
    return shallowCloneTerm(str, value);
  },

  ucase: function (a: Term): Term {
    return shallowCloneTerm(a, a.value.toUpperCase());
  },

  lcase: function (a: Term): Term {
    return shallowCloneTerm(a, a.value.toLowerCase());
  },

  strstarts: function (term: Term, substring: Term): Term {
    const a = term.value;
    const b = substring.value;
    return createBoolean(a.startsWith(b));
  },

  strends: function (term: Term, substring: Term): Term {
    const a = term.value;
    const b = substring.value;
    return createBoolean(a.endsWith(b));
  },

  contains: function (term: Term, substring: Term): Term {
    const a = term.value;
    const b = substring.value;
    return createBoolean(a.indexOf(b) >= 0);
  },

  strbefore: function (term: Term, token: Term): Term {
    const index = term.value.indexOf(token.value);
    const value = index > -1 ? term.value.substring(0, index) : "";
    return shallowCloneTerm(term, value);
  },

  strafter: function (str: Term, token: Term): Term {
    const index = str.value.indexOf(token.value);
    const value =
      index > -1 ? str.value.substring(index + token.value.length) : "";
    return shallowCloneTerm(str, value);
  },

  encode_for_uri: function (a: Term): Term {
    return dataFactory.literal(encodeURIComponent(a.value));
  },

  concat: function (a: Term, b: Term): Term {
    if (termIsLiteral(a) && termIsLiteral(b)) {
      return shallowCloneTerm(a, a.value + b.value);
    }
    return dataFactory.literal(a.value + b.value);
  },

  langmatches: function (langTag: Term, langRange: Term): Term {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    const tag = langTag.value.toLowerCase();
    const range = langRange.value.toLowerCase();
    const test =
      tag === range ||
      range === "*" ||
      tag.substr(1, range.length + 1) === range + "-";
    return createBoolean(test);
  },

  regex: function (subject: Term, pattern: Term, flags?: Term) {
    const regexp =
      flags === undefined
        ? new RegExp(pattern.value)
        : new RegExp(pattern.value, flags.value);
    return createBoolean(regexp.test(subject.value));
  },

  replace: function (
    arg: Term,
    pattern: Term,
    replacement: Term,
    flags?: Term
  ) {
    const regexp =
      flags === undefined
        ? new RegExp(pattern.value)
        : new RegExp(pattern.value, flags.value);
    const newValue = arg.value.replace(regexp, replacement.value);
    if (termIsIRI(arg)) {
      return dataFactory.namedNode(newValue);
    } else if (termIsBNode(arg)) {
      return dataFactory.blankNode(newValue);
    }
    return shallowCloneTerm(arg, newValue);
  },

  /*
    Functions on Numerics https://www.w3.org/TR/sparql11-query/#func-numerics
  */

  abs: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsNumeric(a)) {
      return createInteger(Math.abs(asJS(a.value, a.datatype.value)));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the absolute value of the non-numeric term ${a}`
    );
  },

  round: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsNumeric(a)) {
      return createInteger(Math.round(asJS(a.value, a.datatype.value)));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the rounded value of the non-numeric term ${a}`
    );
  },

  ceil: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsNumeric(a)) {
      return createInteger(Math.ceil(asJS(a.value, a.datatype.value)));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute Math.ceil on the non-numeric term ${a}`
    );
  },

  floor: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsNumeric(a)) {
      return createInteger(Math.floor(asJS(a.value, a.datatype.value)));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute Math.floor on the non-numeric term ${a}`
    );
  },

  /*
    Functions on Dates and Times https://www.w3.org/TR/sparql11-query/#func-date-time
  */

  now: function (): Term {
    return createDate(new Date());
  },

  year: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      return createInteger(Number(parseISO8601(a.value).year));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the year of the RDF Term ${a}, as it is not a date`
    );
  },

  month: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      const value = asJS(a.value, a.datatype.value);
      return createInteger(Number(parseISO8601(a.value).month));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the month of the RDF Term ${a}, as it is not a date`
    );
  },

  day: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      return createInteger(Number(parseISO8601(a.value).day));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the day of the RDF Term ${a}, as it is not a date`
    );
  },

  hours: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      return createInteger(Number(parseISO8601(a.value).hour));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hours of the RDF Term ${a}, as it is not a date`
    );
  },

  minutes: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      return createInteger(Number(parseISO8601(a.value).minute));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the minutes of the RDF Term ${a}, as it is not a date`
    );
  },

  seconds: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      return createDecimal(Number(parseISO8601(a.value).second));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the seconds of the RDF Term ${a}, as it is not a date`
    );
  },

  tz: function (a: Term): Term {
    if (termIsLiteral(a) && literalIsDate(a)) {
      return dataFactory.literal(parseISO8601(a.value).timezone);
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the timezone of the RDF Term ${a}, as it is not a date`
    );
  },

  /*
    Hash Functions https://www.w3.org/TR/sparql11-query/#func-hash
  */

  md5: async function (a: Term): Promise<Term> {
    return dataFactory.literal((await import("js-md5")).md5.hex(a.value));
  },
  sha1: digestOperation("SHA-1"),
  sha256: digestOperation("SHA-256"),
  sha384: digestOperation("SHA-384"),
  sha512: digestOperation("SHA-512"),
};

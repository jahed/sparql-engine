"use strict";

import type {
  BlankNode,
  Literal,
  NamedNode,
  Quad,
  Quad_Predicate,
} from "@rdfjs/types";
import { formatISO, parseISO } from "date-fns";
import { DataFactory } from "rdf-data-factory";
import { termToString } from "rdf-string";
import type { Triple, Wildcard } from "sparqljs";
import type {
  EngineExpression,
  EngineIRI,
  EngineLiteral,
  EngineTriple,
  EngineTripleValue,
  EngineVariable,
} from "../types.ts";

export const dataFactory = new DataFactory();

export function tripleEquals(a: EngineTriple, b: EngineTriple): boolean {
  return (
    a.subject.equals(b.subject) &&
    a.predicate.equals(b.predicate) &&
    a.object.equals(b.object)
  );
}

/**
 * sparqljs predicates support PathProperty syntax which is currently ignored
 * outside of PathStageBuilder for compatibility with standard Quads.
 */
export function tripleToQuad(triple: Triple): Quad {
  return dataFactory.quad(
    triple.subject,
    triple.predicate as Quad_Predicate,
    triple.object
  );
}

export function termToValue<T = unknown>(term: EngineTripleValue): T {
  if (isLiteral(term)) {
    return asJS(term.value, term.datatype.value);
  }
  return term.value as T;
}

export function asJS(value: string, type: string | null): any {
  switch (type) {
    case XSD("integer"):
    case XSD("byte"):
    case XSD("short"):
    case XSD("int"):
    case XSD("unsignedByte"):
    case XSD("unsignedShort"):
    case XSD("unsignedInt"):
    case XSD("number"):
    case XSD("float"):
    case XSD("decimal"):
    case XSD("double"):
    case XSD("long"):
    case XSD("unsignedLong"):
    case XSD("positiveInteger"):
    case XSD("nonPositiveInteger"):
    case XSD("negativeInteger"):
    case XSD("nonNegativeInteger"):
      return Number(value);
    case XSD("boolean"):
      return value === "true" || value === "1";
    case XSD("dateTime"):
    case XSD("dateTimeStamp"):
    case XSD("date"):
    case XSD("time"):
    case XSD("duration"):
      return parseISO(value);
    case XSD("hexBinary"):
      return Buffer.from(value, "hex");
    case XSD("base64Binary"):
      return Buffer.from(value, "base64");
    default:
      return value;
  }
}

export function createIRI(value: string): NamedNode {
  return dataFactory.namedNode(value);
}

export function createBNode(value?: string): BlankNode {
  return dataFactory.blankNode(value);
}

export function createLiteral(value: string): Literal {
  return dataFactory.literal(value);
}

export function createTypedLiteral(value: any, type: string): Literal {
  return dataFactory.literal(`${value}`, createIRI(type));
}

export function createLangLiteral(value: string, language: string): Literal {
  return dataFactory.literal(value, language);
}

export function createInteger(value: number): Literal {
  return createTypedLiteral(value, XSD("integer"));
}

export function createDecimal(value: number): Literal {
  return createTypedLiteral(value, XSD("decimal"));
}

export function createFloat(value: number): Literal {
  return createTypedLiteral(value, XSD("float"));
}

export function createBoolean(value: boolean): Literal {
  return value ? createTrue() : createFalse();
}

export function createTrue(): Literal {
  return createTypedLiteral("true", XSD("boolean"));
}

export function createFalse(): Literal {
  return createTypedLiteral("false", XSD("boolean"));
}

export function createDate(date: Date): Literal {
  return createTypedLiteral(formatISO(date), XSD("dateTime"));
}

export const UNBOUND = Object.freeze(createIRI("UNBOUND"));
export function createUnbound(): EngineIRI {
  return UNBOUND;
}

export function shallowCloneTerm(
  term: EngineTripleValue,
  newValue: string
): EngineTripleValue {
  if (termIsLiteral(term)) {
    if (term.language !== "") {
      return createLangLiteral(newValue, term.language);
    }
    return createTypedLiteral(newValue, term.datatype.value);
  }
  return createLiteral(newValue);
}

export function termIsLiteral(term: EngineTripleValue): term is Literal {
  return term.termType === "Literal";
}

export function termIsIRI(term: EngineTripleValue): term is NamedNode {
  return term.termType === "NamedNode";
}

export function termIsBNode(term: EngineTripleValue): term is BlankNode {
  return term.termType === "BlankNode";
}

export function literalIsNumeric(literal: Literal): boolean {
  switch (literal.datatype.value) {
    case XSD("integer"):
    case XSD("byte"):
    case XSD("short"):
    case XSD("int"):
    case XSD("unsignedByte"):
    case XSD("unsignedShort"):
    case XSD("unsignedInt"):
    case XSD("number"):
    case XSD("float"):
    case XSD("decimal"):
    case XSD("double"):
    case XSD("long"):
    case XSD("unsignedLong"):
    case XSD("positiveInteger"):
    case XSD("nonPositiveInteger"):
    case XSD("negativeInteger"):
    case XSD("nonNegativeInteger"):
      return true;
    default:
      return false;
  }
}

export function literalIsDate(literal: Literal): boolean {
  return literal.datatype.value === XSD("dateTime");
}

export function literalIsBoolean(literal: Literal): boolean {
  return literal.datatype.value === XSD("boolean");
}

// export function termEquals(a: Term, b: Term): boolean {
//   if (termIsLiteral(a) && termIsLiteral(b)) {
//     if (literalIsDate(a) && literalIsDate(b)) {
//       const valueA = asJS(a.value, a.datatype.value);
//       const valueB = asJS(b.value, b.datatype.value);
//       return isEqual(valueA, valueB);
//     }
//     return (
//       a.value === b.value &&
//       a.datatype.value === b.datatype.value &&
//       a.language === b.language
//     );
//   }
//   return a.value === b.value;
// }

export function countVariables(triple: EngineTriple): number {
  let count = 0;
  if (isVariable(triple.subject)) {
    count++;
  }
  if (isVariable(triple.predicate)) {
    count++;
  }
  if (isVariable(triple.object)) {
    count++;
  }
  return count;
}

export function isVariable(
  value: EngineTripleValue | EngineExpression | Wildcard
): value is EngineVariable {
  return "termType" in value && value.termType === "Variable";
}

export function isLiteral(value: EngineTripleValue): value is EngineLiteral {
  return "termType" in value && value.termType === "Literal";
}

export function isIRI(value: EngineTripleValue): value is EngineIRI {
  return "termType" in value && value.termType === "NamedNode";
}

export function isBlank(value: EngineTripleValue): value is BlankNode {
  return "termType" in value && value.termType === "BlankNode";
}

export function hashTriple(triple: EngineTriple): string {
  return `s=${termToString(triple.subject)}&p=${termToString(triple.predicate)}&o=${termToString(triple.object)}`;
}

export function XSD(suffix: string): string {
  return `http://www.w3.org/2001/XMLSchema#${suffix}`;
}

export function RDF(suffix: string): string {
  return `http://www.w3.org/1999/02/22-rdf-syntax-ns#${suffix}`;
}

export function SEF(suffix: string): string {
  return `https://callidon.github.io/sparql-engine/functions#${suffix}`;
}

export function SES(suffix: string): string {
  return `https://callidon.github.io/sparql-engine/search#${suffix}`;
}

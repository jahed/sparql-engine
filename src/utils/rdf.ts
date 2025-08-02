import type {
  BlankNode,
  Literal,
  NamedNode,
  Quad,
  Quad_Predicate,
} from "@rdfjs/types";
import { formatISO, parseISO } from "date-fns";
import { DataFactory } from "rdf-data-factory";
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
    case XSD_integer:
    case XSD_byte:
    case XSD_short:
    case XSD_int:
    case XSD_unsignedByte:
    case XSD_unsignedShort:
    case XSD_unsignedInt:
    case XSD_number:
    case XSD_float:
    case XSD_decimal:
    case XSD_double:
    case XSD_long:
    case XSD_unsignedLong:
    case XSD_positiveInteger:
    case XSD_nonPositiveInteger:
    case XSD_negativeInteger:
    case XSD_nonNegativeInteger:
      return Number(value);
    case XSD_boolean:
      return value === "true" || value === "1";
    case XSD_dateTime:
    case XSD_dateTimeStamp:
    case XSD_date:
    case XSD_time:
    case XSD_duration:
      return parseISO(value);
    case XSD_hexBinary:
      return Buffer.from(value, "hex");
    case XSD_base64Binary:
      return Buffer.from(value, "base64");
    default:
      return value;
  }
}

export function createTypedLiteral(value: any, type: string): Literal {
  return dataFactory.literal(`${value}`, dataFactory.namedNode(type));
}

export function createLangLiteral(value: string, language: string): Literal {
  return dataFactory.literal(value, language);
}

export function createInteger(value: number): Literal {
  return createTypedLiteral(value, XSD_integer);
}

export function createDecimal(value: number): Literal {
  return createTypedLiteral(value, XSD_decimal);
}

export function createFloat(value: number): Literal {
  return createTypedLiteral(value, XSD_float);
}

export function createBoolean(value: boolean): Literal {
  return value ? LITERAL_true : LITERAL_false;
}

export function createDate(date: Date): Literal {
  return createTypedLiteral(formatISO(date), XSD_dateTime);
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
  return dataFactory.literal(newValue);
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
    case XSD_integer:
    case XSD_byte:
    case XSD_short:
    case XSD_int:
    case XSD_unsignedByte:
    case XSD_unsignedShort:
    case XSD_unsignedInt:
    case XSD_number:
    case XSD_float:
    case XSD_decimal:
    case XSD_double:
    case XSD_long:
    case XSD_unsignedLong:
    case XSD_positiveInteger:
    case XSD_nonPositiveInteger:
    case XSD_negativeInteger:
    case XSD_nonNegativeInteger:
      return true;
    default:
      return false;
  }
}

export function literalIsDate(literal: Literal): boolean {
  return literal.datatype.value === XSD_dateTime;
}

export function literalIsBoolean(literal: Literal): boolean {
  return literal.datatype.value === XSD_boolean;
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

const XSD = (suffix: string): string => {
  return `http://www.w3.org/2001/XMLSchema#${suffix}`;
};
export const XSD_integer = XSD("integer");
export const XSD_byte = XSD("byte");
export const XSD_short = XSD("short");
export const XSD_int = XSD("int");
export const XSD_unsignedByte = XSD("unsignedByte");
export const XSD_unsignedShort = XSD("unsignedShort");
export const XSD_unsignedInt = XSD("unsignedInt");
export const XSD_number = XSD("number");
export const XSD_float = XSD("float");
export const XSD_decimal = XSD("decimal");
export const XSD_double = XSD("double");
export const XSD_long = XSD("long");
export const XSD_unsignedLong = XSD("unsignedLong");
export const XSD_positiveInteger = XSD("positiveInteger");
export const XSD_nonPositiveInteger = XSD("nonPositiveInteger");
export const XSD_negativeInteger = XSD("negativeInteger");
export const XSD_nonNegativeInteger = XSD("nonNegativeInteger");
export const XSD_boolean = XSD("boolean");
export const XSD_dateTime = XSD("dateTime");
export const XSD_dateTimeStamp = XSD("dateTimeStamp");
export const XSD_date = XSD("date");
export const XSD_time = XSD("time");
export const XSD_duration = XSD("duration");
export const XSD_hexBinary = XSD("hexBinary");
export const XSD_base64Binary = XSD("base64Binary");

export const UNBOUND = Object.freeze(dataFactory.namedNode("UNBOUND"));
export const VARIABLE_s = Object.freeze(dataFactory.variable("s"));
export const VARIABLE_p = Object.freeze(dataFactory.variable("p"));
export const VARIABLE_o = Object.freeze(dataFactory.variable("o"));
export const LITERAL_true = Object.freeze(
  createTypedLiteral("true", XSD_boolean)
);
export const LITERAL_false = Object.freeze(
  createTypedLiteral("false", XSD_boolean)
);

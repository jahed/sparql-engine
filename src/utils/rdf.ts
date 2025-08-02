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

export const RDF = new DataFactory();

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
  return RDF.quad(
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
  return RDF.literal(`${value}`, RDF.namedNode(type));
}

export function createLangLiteral(value: string, language: string): Literal {
  return RDF.literal(value, language);
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
  return RDF.literal(newValue);
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

export const XSD_integer = "http://www.w3.org/2001/XMLSchema#integer";
export const XSD_byte = "http://www.w3.org/2001/XMLSchema#byte";
export const XSD_short = "http://www.w3.org/2001/XMLSchema#short";
export const XSD_int = "http://www.w3.org/2001/XMLSchema#int";
export const XSD_unsignedByte = "http://www.w3.org/2001/XMLSchema#unsignedByte";
export const XSD_unsignedShort =
  "http://www.w3.org/2001/XMLSchema#unsignedShort";
export const XSD_unsignedInt = "http://www.w3.org/2001/XMLSchema#unsignedInt";
export const XSD_number = "http://www.w3.org/2001/XMLSchema#number";
export const XSD_float = "http://www.w3.org/2001/XMLSchema#float";
export const XSD_decimal = "http://www.w3.org/2001/XMLSchema#decimal";
export const XSD_double = "http://www.w3.org/2001/XMLSchema#double";
export const XSD_long = "http://www.w3.org/2001/XMLSchema#long";
export const XSD_unsignedLong = "http://www.w3.org/2001/XMLSchema#unsignedLong";
export const XSD_positiveInteger =
  "http://www.w3.org/2001/XMLSchema#positiveInteger";
export const XSD_nonPositiveInteger =
  "http://www.w3.org/2001/XMLSchema#nonPositiveInteger";
export const XSD_negativeInteger =
  "http://www.w3.org/2001/XMLSchema#negativeInteger";
export const XSD_nonNegativeInteger =
  "http://www.w3.org/2001/XMLSchema#nonNegativeInteger";
export const XSD_boolean = "http://www.w3.org/2001/XMLSchema#boolean";
export const XSD_dateTime = "http://www.w3.org/2001/XMLSchema#dateTime";
export const XSD_dateTimeStamp =
  "http://www.w3.org/2001/XMLSchema#dateTimeStamp";
export const XSD_date = "http://www.w3.org/2001/XMLSchema#date";
export const XSD_time = "http://www.w3.org/2001/XMLSchema#time";
export const XSD_duration = "http://www.w3.org/2001/XMLSchema#duration";
export const XSD_hexBinary = "http://www.w3.org/2001/XMLSchema#hexBinary";
export const XSD_base64Binary = "http://www.w3.org/2001/XMLSchema#base64Binary";

export const UNBOUND = Object.freeze(RDF.namedNode("UNBOUND"));
export const VARIABLE_s = Object.freeze(RDF.variable("s"));
export const VARIABLE_p = Object.freeze(RDF.variable("p"));
export const VARIABLE_o = Object.freeze(RDF.variable("o"));
export const LITERAL_true = Object.freeze(
  createTypedLiteral("true", XSD_boolean)
);
export const LITERAL_false = Object.freeze(
  createTypedLiteral("false", XSD_boolean)
);

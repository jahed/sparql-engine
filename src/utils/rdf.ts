"use strict";

import DataFactory from "@rdfjs/data-model";
import { formatISO, isEqual, parseISO } from "date-fns";
import type { BlankNode, Literal, NamedNode, Term } from "rdf-js";
import { stringToTerm, termToString } from "rdf-string";
import type { Algebra } from "sparqljs";

/**
 * Test if two triple (patterns) are equals
 * @param a - First triple (pattern)
 * @param b - Second triple (pattern)
 * @return True if the two triple (patterns) are equals, False otherwise
 */
export function tripleEquals(
  a: Algebra.TripleObject,
  b: Algebra.TripleObject
): boolean {
  return (
    a.subject === b.subject &&
    a.predicate === b.predicate &&
    a.object === b.object
  );
}

/**
 * Convert an string RDF Term to a RDFJS representation
 * @see https://rdf.js.org/data-model-spec
 * @param term - A string-based term representation
 * @return A RDF.js term
 */
export function fromN3(term: string): Term {
  return stringToTerm(term);
}

/**
 * Convert an RDFJS term to a string-based representation
 * @see https://rdf.js.org/data-model-spec
 * @param term A RDFJS term
 * @return A string-based term representation
 */
export function toN3(term: Term): string {
  return termToString(term);
}

/**
 * Parse a RDF Literal to its Javascript representation
 * @see https://www.w3.org/TR/rdf11-concepts/#section-Datatypes
 * @param value - Literal value
 * @param type - Literal datatype
 * @return Javascript representation of the literal
 */
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

/**
 * Creates an IRI in RDFJS format
 * @param value - IRI value
 * @return A new IRI in RDFJS format
 */
export function createIRI(value: string): NamedNode {
  if (value.startsWith("<") && value.endsWith(">")) {
    return DataFactory.namedNode(value.slice(0, value.length - 1));
  }
  return DataFactory.namedNode(value);
}

/**
 * Creates a Blank Node in RDFJS format
 * @param value - Blank node value
 * @return A new Blank Node in RDFJS format
 */
export function createBNode(value?: string): BlankNode {
  return DataFactory.blankNode(value);
}

/**
 * Creates a Literal in RDFJS format, without any datatype or language tag
 * @param value - Literal value
 * @return A new literal in RDFJS format
 */
export function createLiteral(value: string): Literal {
  return DataFactory.literal(value);
}

/**
 * Creates an typed Literal in RDFJS format
 * @param value - Literal value
 * @param type - Literal type (integer, float, dateTime, ...)
 * @return A new typed Literal in RDFJS format
 */
export function createTypedLiteral(value: any, type: string): Literal {
  return DataFactory.literal(`${value}`, createIRI(type));
}

/**
 * Creates a Literal with a language tag in RDFJS format
 * @param value - Literal value
 * @param language - Language tag (en, fr, it, ...)
 * @return A new Literal with a language tag in RDFJS format
 */
export function createLangLiteral(value: string, language: string): Literal {
  return DataFactory.literal(value, language);
}

/**
 * Creates an integer Literal in RDFJS format
 * @param value - Integer
 * @return A new integer in RDFJS format
 */
export function createInteger(value: number): Literal {
  return createTypedLiteral(value, XSD("integer"));
}

/**
 * Creates an decimal Literal in RDFJS format
 * @param value - Float
 * @return A new float in RDFJS format
 */
export function createDecimal(value: number): Literal {
  return createTypedLiteral(value, XSD("decimal"));
}

/**
 * Creates an float Literal in RDFJS format
 * @param value - Float
 * @return A new float in RDFJS format
 */
export function createFloat(value: number): Literal {
  return createTypedLiteral(value, XSD("float"));
}

/**
 * Creates a Literal from a boolean, in RDFJS format
 * @param value - Boolean
 * @return A new boolean in RDFJS format
 */
export function createBoolean(value: boolean): Literal {
  return value ? createTrue() : createFalse();
}

/**
 * Creates a True boolean, in RDFJS format
 * @return A new boolean in RDFJS format
 */
export function createTrue(): Literal {
  return createTypedLiteral("true", XSD("boolean"));
}

/**
 * Creates a False boolean, in RDFJS format
 * @return A new boolean in RDFJS format
 */
export function createFalse(): Literal {
  return createTypedLiteral("false", XSD("boolean"));
}

/**
 * Creates a Literal from a Date, in RDFJS format
 * @param date - Date
 * @return A new date literal in RDFJS format
 */
export function createDate(date: Date): Literal {
  return createTypedLiteral(formatISO(date), XSD("dateTime"));
}

/**
 * Creates an unbounded literal, used when a variable is not bounded in a set of bindings
 * @return A new literal in RDFJS format
 */
export function createUnbound(): Literal {
  return createLiteral("UNBOUND");
}

/**
 * Clone a literal and replace its value with another one
 * @param  base     - Literal to clone
 * @param  newValue - New literal value
 * @return The literal with its new value
 */
export function shallowCloneTerm(term: Term, newValue: string): Term {
  if (termIsLiteral(term)) {
    if (term.language !== "") {
      return createLangLiteral(newValue, term.language);
    }
    return createTypedLiteral(newValue, term.datatype.value);
  }
  return createLiteral(newValue);
}

/**
 * Test if a RDFJS Term is a Literal
 * @param term - RDFJS Term
 * @return True of the term is a Literal, False otherwise
 */
export function termIsLiteral(term: Term): term is Literal {
  return term.termType === "Literal";
}

/**
 * Test if a RDFJS Term is an IRI, i.e., a NamedNode
 * @param term - RDFJS Term
 * @return True of the term is an IRI, False otherwise
 */
export function termIsIRI(term: Term): term is NamedNode {
  return term.termType === "NamedNode";
}

/**
 * Test if a RDFJS Term is a Blank Node
 * @param term - RDFJS Term
 * @return True of the term is a Blank Node, False otherwise
 */
export function termIsBNode(term: Term): term is BlankNode {
  return term.termType === "BlankNode";
}

/**
 * Test if a RDFJS Literal is a number
 * @param literal - RDFJS Literal
 * @return True of the Literal is a number, False otherwise
 */
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

/**
 * Test if a RDFJS Literal is a date
 * @param literal - RDFJS Literal
 * @return True of the Literal is a date, False otherwise
 */
export function literalIsDate(literal: Literal): boolean {
  return literal.datatype.value === XSD("dateTime");
}

/**
 * Test if a RDFJS Literal is a boolean
 * @param term - RDFJS Literal
 * @return True of the Literal is a boolean, False otherwise
 */
export function literalIsBoolean(literal: Literal): boolean {
  return literal.datatype.value === XSD("boolean");
}

/**
 * Test if two RDFJS Terms are equals
 * @param a - First Term
 * @param b - Second Term
 * @return True if the two RDFJS Terms are equals, False
 */
export function termEquals(a: Term, b: Term): boolean {
  if (termIsLiteral(a) && termIsLiteral(b)) {
    if (literalIsDate(a) && literalIsDate(b)) {
      const valueA = asJS(a.value, a.datatype.value);
      const valueB = asJS(b.value, b.datatype.value);
      return isEqual(valueA, valueB);
    }
    return (
      a.value === b.value &&
      a.datatype.value === b.datatype.value &&
      a.language === b.language
    );
  }
  return a.value === b.value;
}

/**
 * Create a RDF triple in Object representation
 * @param  {string} subj - Triple's subject
 * @param  {string} pred - Triple's predicate
 * @param  {string} obj  - Triple's object
 * @return A RDF triple in Object representation
 */
export function triple(
  subj: string,
  pred: string,
  obj: string
): Algebra.TripleObject {
  return {
    subject: subj,
    predicate: pred,
    object: obj,
  };
}

/**
 * Count the number of variables in a Triple Pattern
 * @param  {Object} triple - Triple Pattern to process
 * @return The number of variables in the Triple Pattern
 */
export function countVariables(triple: Algebra.TripleObject): number {
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

/**
 * Return True if a string is a SPARQL variable
 * @param  str - String to test
 * @return True if the string is a SPARQL variable, False otherwise
 */
export function isVariable(str: unknown): boolean {
  if (typeof str !== "string") {
    return false;
  }
  return str.startsWith("?");
}

/**
 * Return True if a string is a RDF Literal
 * @param  str - String to test
 * @return True if the string is a RDF Literal, False otherwise
 */
export function isLiteral(str: string): boolean {
  return str.startsWith('"');
}

/**
 * Return True if a string is a RDF IRI/URI
 * @param  str - String to test
 * @return True if the string is a RDF IRI/URI, False otherwise
 */
export function isIRI(str: string): boolean {
  return !isVariable(str) && !isLiteral(str);
}

/**
 * Get the value (excluding datatype & language tags) of a RDF literal
 * @param literal - RDF Literal
 * @return The literal's value
 */
export function getLiteralValue(literal: string): string {
  if (literal.startsWith('"')) {
    let stopIndex = literal.length - 1;
    if (literal.includes('"^^<') && literal.endsWith(">")) {
      stopIndex = literal.lastIndexOf('"^^<');
    } else if (literal.includes('"@') && !literal.endsWith('"')) {
      stopIndex = literal.lastIndexOf('"@');
    }
    return literal.slice(1, stopIndex);
  }
  return literal;
}

/**
 * Hash Triple (pattern) to assign it an unique ID
 * @param triple - Triple (pattern) to hash
 * @return An unique ID to identify the Triple (pattern)
 */
export function hashTriple(triple: Algebra.TripleObject): string {
  return `s=${triple.subject}&p=${triple.predicate}&o=${triple.object}`;
}

/**
 * Create an IRI under the XSD namespace
 * (<http://www.w3.org/2001/XMLSchema#>)
 * @param suffix - Suffix appended to the XSD namespace to create an IRI
 * @return An new IRI, under the XSD namespac
 */
export function XSD(suffix: string): string {
  return `http://www.w3.org/2001/XMLSchema#${suffix}`;
}

/**
 * Create an IRI under the RDF namespace
 * (<http://www.w3.org/1999/02/22-rdf-syntax-ns#>)
 * @param suffix - Suffix appended to the RDF namespace to create an IRI
 * @return An new IRI, under the RDF namespac
 */
export function RDF(suffix: string): string {
  return `http://www.w3.org/1999/02/22-rdf-syntax-ns#${suffix}`;
}

/**
 * Create an IRI under the SEF namespace
 * (<https://callidon.github.io/sparql-engine/functions#>)
 * @param suffix - Suffix appended to the SES namespace to create an IRI
 * @return An new IRI, under the SES namespac
 */
export function SEF(suffix: string): string {
  return `https://callidon.github.io/sparql-engine/functions#${suffix}`;
}

/**
 * Create an IRI under the SES namespace
 * (<https://callidon.github.io/sparql-engine/search#>)
 * @param suffix - Suffix appended to the SES namespace to create an IRI
 * @return An new IRI, under the SES namespac
 */
export function SES(suffix: string): string {
  return `https://callidon.github.io/sparql-engine/search#${suffix}`;
}

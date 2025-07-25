import type { Literal, NamedNode, Quad, Variable } from "@rdfjs/types";
import type { Expression } from "sparqljs";

export type EngineTriple = Quad;
export type EngineTripleValue =
  | EngineTriple["subject"]
  | EngineTriple["predicate"]
  | EngineTriple["object"];
export type EngineVariable = Variable;
export type EngineExpression = Expression;
export type EngineIRI = NamedNode;
export type EngineLiteral = Literal;

export type EngineSubject = EngineTriple["subject"];
export type EnginePredicate = EngineTriple["predicate"];
export type EngineObject = EngineTriple["object"];

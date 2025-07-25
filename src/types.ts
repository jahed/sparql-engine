import type { IStringQuad } from "rdf-string";

export type StringTriple = Pick<
  IStringQuad,
  "subject" | "predicate" | "object"
>;

// SPDX-License-Identifier: MIT
import type { EngineTripleValue } from "../../types.ts";
import {
  asJS,
  createFloat,
  dataFactory,
  literalIsNumeric,
  termIsLiteral,
} from "../../utils/rdf.ts";

type Term = EngineTripleValue;

export default {
  /*
    Hyperbolic functions (cosh, sinh, tanh, ...)
    https://en.wikipedia.org/wiki/Hyperbolic_function
  */

  // Hyperbolic cosinus
  "https://callidon.github.io/sparql-engine/functions#cosh": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat(Math.cosh(value));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hyperbolic cosinus of ${x}, as it is not a number`
    );
  },

  // Hyperbolic sinus
  "https://callidon.github.io/sparql-engine/functions#sinh": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat(Math.sinh(value));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hyperbolic sinus of ${x}, as it is not a number`
    );
  },

  // Hyperbolic tangent
  "https://callidon.github.io/sparql-engine/functions#tanh": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat(Math.tanh(value));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hyperbolic tangent of ${x}, as it is not a number`
    );
  },

  // Hyperbolic cotangent
  "https://callidon.github.io/sparql-engine/functions#coth": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      if (value === 0) {
        throw new SyntaxError(
          `SPARQL expression error: cannot compute the hyperbolic cotangent of ${x}, as it is equals to 0`
        );
      }
      return createFloat((Math.exp(2 * value) + 1) / (Math.exp(2 * value) - 1));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hyperbolic cotangent of ${x}, as it is not a number`
    );
  },

  // Hyperbolic secant
  "https://callidon.github.io/sparql-engine/functions#sech": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat((2 * Math.exp(value)) / (Math.exp(2 * value) + 1));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hyperbolic secant of ${x}, as it is not a number`
    );
  },

  // Hyperbolic cosecant
  "https://callidon.github.io/sparql-engine/functions#csch": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat((2 * Math.exp(value)) / (Math.exp(2 * value) - 1));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot compute the hyperbolic cosecant of ${x}, as it is not a number`
    );
  },

  /*
    Radians to Degree & Degrees to Randians transformations
  */
  "https://callidon.github.io/sparql-engine/functions#toDegrees": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat(value * (180 / Math.PI));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot convert ${x} to degrees, as it is does not look like radians`
    );
  },

  "https://callidon.github.io/sparql-engine/functions#toRadians": function (
    x: Term
  ): Term {
    if (termIsLiteral(x) && literalIsNumeric(x)) {
      const value = asJS(x.value, x.datatype.value);
      return createFloat(value * (Math.PI / 180));
    }
    throw new SyntaxError(
      `SPARQL expression error: cannot convert ${x} to radians, as it is does not look like degrees`
    );
  },

  /*
    Generator functions, i.e? SPARQL expression whose evaluation generates several RDF Terms
  */

  // Split a RDF Term as a string using a separator
  "https://callidon.github.io/sparql-engine/functions#strsplit": function (
    term: Term,
    separator: Term
  ): Iterable<Term> {
    return (function* () {
      for (let token of term.value.split(separator.value)) {
        yield dataFactory.literal(token);
      }
      return;
    })();
  },
};

// SPDX-License-Identifier: MIT
"use strict";

export default {
  /** The set of prefixes of a SPARQL query, as extracted by sparql.js */
  PREFIXES: Symbol("SPARQL_ENGINE_QUERY_PREFIXES"),
  /** Identify a SPARQL query with a LIMIT modifier and/or an OFFSET modifier */
  HAS_LIMIT_OFFSET: Symbol("SPARQL_ENGINE_QUERY_HAS_LIMIT_OFFSET"),
  /** The default buffer size used in the bound join algorithm */
  BOUND_JOIN_BUFFER_SIZE: Symbol(
    "SPARQL_ENGINE_INTERNALS_BOUND_JOIN_BUFFER_SIZE"
  ),
  /** Forces all joins to be done using the Index Join algorithm */
  FORCE_INDEX_JOIN: Symbol("SPARQL_ENGINE_FORCE_INDEX_JOIN"),
};

// SPDX-License-Identifier: MIT
/**
 * Enum describing the query capabilities of a Graph
 */
export type GraphCapability = number;
export const GRAPH_CAPABILITY = {
  UNION: 0,
  ESTIMATE_TRIPLE_CARD: 1,
};

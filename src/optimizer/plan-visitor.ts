// SPDX-License-Identifier: MIT
import { cloneDeep } from "lodash-es";
import type {
  BgpPattern,
  BindPattern,
  FilterPattern,
  GraphPattern,
  GroupPattern,
  OptionalPattern,
  Pattern,
  ServicePattern,
  SparqlQuery,
  UnionPattern,
  ValuesPattern,
} from "sparqljs";

/**
 * A Visitor which performs a Depth-first traversal of a SPARQL query expression tree
 * and transforms each node.
 * Subclasses are used to implements SPARQl query optimization rules.
 */
export default class PlanVisitor {
  /**
   * Visit all nodes starting from this one, using a depth-first traversal,
   * and transform them.
   * @param  node - Root of the expression tree to traverse
   * @return The transformed expression tree
   */
  visit(node: SparqlQuery): SparqlQuery;
  visit(node: Pattern): Pattern;
  visit(node: SparqlQuery | Pattern): SparqlQuery | Pattern {
    switch (node.type) {
      case "query":
        const newNode = cloneDeep(node);
        newNode.where = node.where?.map((n) => this.visit(n));
        return newNode;
      case "bgp":
        return this.visitBGP(node);
      case "union":
        return this.visitUnion(node);
      case "optional":
        return this.visitOptional(node);
      case "group":
        return this.visitGroup(node);
      case "filter":
        return this.visitFilter(node);
      case "service":
        return this.visitService(node);
      case "bind":
        return this.visitBind(node);
      case "values":
        return this.visitValues(node);
      default:
        return node;
    }
  }

  /**
   * Visit and transform a Basic Graph Pattern node.
   * By default, peform no transformation on the node.
   * @param  node - Basic Graph Pattern node
   * @return The transformed Basic Graph Pattern node
   */
  visitBGP(node: BgpPattern): BgpPattern {
    return node;
  }

  /**
   * Visit and transform a SPARQL Group pattern node.
   * By default, recursively transform all members of the group.
   * @param  node - SPARQL Group pattern node
   * @return The transformed SPARQL Group pattern node
   */
  visitGroup(node: GroupPattern): GroupPattern {
    const newNode = cloneDeep(node);
    newNode.patterns = newNode.patterns.map((p) => this.visit(p));
    return newNode;
  }

  /**
   * Visit and transform a SPARQL OPTIONAL node.
   * By default, recursively transform all members of the OPTIONAL.
   * @param  node - SPARQL OPTIONAL node
   * @return The transformed SPARQL OPTIONAL node
   */
  visitOptional(node: OptionalPattern): OptionalPattern {
    const newNode = cloneDeep(node);
    newNode.patterns = newNode.patterns.map((p) => this.visit(p));
    return newNode;
  }

  /**
   * Visit and transform a SPARQL UNION node.
   * By default, recursively transform all members of the UNION.
   * @param  node - SPARQL UNION node
   * @return The transformed SPARQL UNION node
   */
  visitUnion(node: UnionPattern): UnionPattern {
    const newNode = cloneDeep(node);
    newNode.patterns = newNode.patterns.map((p) => this.visit(p));
    return newNode;
  }

  /**
   * Visit and transform a SPARQL FILTER node.
   * By default, peform no transformation on the node.
   * @param  node - SPARQL FILTER node
   * @return The transformed SPARQL FILTER node
   */
  visitFilter(node: FilterPattern): FilterPattern {
    return node;
  }

  /**
   * Visit and transform a SPARQL GRAPH node.
   * By default, recursively transform all members of the GRAPH.
   * @param  node - SPARQL GRAPH node
   * @return The transformed SPARQL GRAPH node
   */
  visitGraph(node: GraphPattern): GraphPattern {
    const newNode = cloneDeep(node);
    newNode.patterns = newNode.patterns.map((p) => this.visit(p));
    return newNode;
  }

  /**
   * Visit and transform a SPARQL SERVICE node.
   * By default, recursively transform all members of the SERVICE.
   * @param  node - SPARQL SERVICE node
   * @return The transformed SPARQL SERVICE node
   */
  visitService(node: ServicePattern): ServicePattern {
    const newNode = cloneDeep(node);
    newNode.patterns = newNode.patterns.map((p) => this.visit(p));
    return newNode;
  }

  /**
   * Visit and transform a SPARQL BIND node.
   * By default, peform no transformation on the node.
   * @param  node - SPARQL BIND node
   * @return The transformed SPARQL BIND node
   */
  visitBind(node: BindPattern): BindPattern {
    return node;
  }

  /**
   * Visit and transform a SPARQL VALUES node.
   * By default, peform no transformation on the node.
   * @param  node - SPARQL VALUES node
   * @return The transformed SPARQL VALUES node
   */
  visitValues(node: ValuesPattern): ValuesPattern {
    return node;
  }
}

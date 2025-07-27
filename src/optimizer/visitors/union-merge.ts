/* file : union-merge.ts
MIT License

Copyright (c) 2018-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

import { cloneDeep, partition } from "lodash-es";

import type { Pattern, UnionPattern } from "sparqljs";
import PlanVisitor from "../plan-visitor.ts";

/**
 * Implements the UNION Merge rule: all SPARQL UNION clauses in the same group pattern
 * should be merged as one single UNION clause.
 * @author Thomas Minier
 */
export default class UnionMerge extends PlanVisitor {
  visitUnion(node: UnionPattern): Pattern {
    const newNode = cloneDeep(node);
    const parts = partition(
      newNode.patterns,
      (group) => group.type === "union"
    );
    const singleUnion = parts[0].reduce<Pattern[]>(
      (acc, c) => acc.concat(c.patterns),
      []
    );
    newNode.patterns = (parts[1] as Pattern[]).concat(singleUnion);
    return newNode;
  }
}

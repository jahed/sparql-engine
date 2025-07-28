# @jahed/sparql-engine

[![npm](https://img.shields.io/npm/v/@jahed/sparql-engine.svg)](https://www.npmjs.com/package/@jahed/sparql-engine)
[![author](https://img.shields.io/badge/author-jahed-%23007fff)](https://jahed.dev/)

SPARQL query engine for servers and web browsers.

## Acknowledgements

This project is a continuation of [Callidon/sparql-engine](https://github.com/Callidon/sparql-engine) which is no longer maintained. For additional history, check out that project's repository.

The aim of this project is to use newer Web APIs, language features, and make the project easier to use and maintain.

## Installation

```sh
npm install @jahed/sparql-engine
```

## Usage

```ts
import type { ExecutionContext, PipelineInput } from "@jahed/sparql-engine";
import SparqlEngineGraph from "@jahed/sparql-engine/rdf/graph.js";
import HashMapDataset from "@jahed/sparql-engine/rdf/hashmap-dataset.js";
import { dataFactory } from "@jahed/sparql-engine/utils/rdf.js";
import type { EngineTriple } from "@jahed/sparql-engine/types.js";

export class MySparqlGraph extends SparqlEngineGraph {
  *find(
    triple: EngineTriple,
    context: ExecutionContext
  ): PipelineInput<EngineTriple> {
    yield dataFactory.quad(
      dataFactory.namedNode("subject"),
      dataFactory.namedNode("predicate"),
      dataFactory.namedNode("object")
    );
  }
  async insert(triple: EngineTriple): Promise<void> {}
  async delete(triple: EngineTriple): Promise<void> {}
  async clear(): Promise<void> {}
}

const sparqlGraph = new MySparqlGraph(graph);
const dataset = new HashMapDataset(sparqlGraph.graphBase, sparqlGraph);
const planner = new PlanBuilder(dataset);

try {
  for await (const bindings of planner.build(query)) {
    // row found
  }
  // query completed
} catch (error) {
  // query has errored
}
```

## License

[MIT](LICENSE).

# @jahed/sparql-engine

[![npm](https://img.shields.io/npm/v/@jahed/sparql-engine.svg)](https://www.npmjs.com/package/@jahed/sparql-engine)
[![author](https://img.shields.io/badge/author-jahed-%23007fff)](https://jahed.dev/)

SPARQL query engine for servers and web browsers.

This project is a continuation of [Callidon/sparql-engine](https://github.com/Callidon/sparql-engine) which is no longer maintained. For additional history, check out that project's repository.

The aim of this project is to use newer Web APIs, language features, and make the project easier to use and maintain.

## Installation

```sh
npm install @jahed/sparql-engine
```

Override `rdf-data-factory` to use v2 in your `package.json`.

```json
{
  "overrides": {
    "sparqljs": {
      "rdf-data-factory": "^2"
    }
  }
}
```

## Usage

```ts
import type { ExecutionContext } from "@jahed/sparql-engine/engine/context/execution-context.js";
import type { PipelineInput } from "@jahed/sparql-engine/engine/pipeline/pipeline-engine.js";
import SparqlEngineGraph from "@jahed/sparql-engine/rdf/graph.js";
import HashMapDataset from "@jahed/sparql-engine/rdf/hashmap-dataset.js";
import { RDF } from "@jahed/sparql-engine/utils/rdf.js";
import type { EngineTriple } from "@jahed/sparql-engine/types.js";

export class MySparqlGraph extends SparqlEngineGraph {
  *find(
    triple: EngineTriple,
    context: ExecutionContext
  ): PipelineInput<EngineTriple> {
    yield RDF.quad(
      RDF.namedNode("subject"),
      RDF.namedNode("predicate"),
      RDF.namedNode("object")
    );
  }
  async insert(triple: EngineTriple): Promise<void> {}
  async delete(triple: EngineTriple): Promise<void> {}
  async clear(): Promise<void> {}
}

const defaultGraph = new MySparqlGraph();
const dataset = new HashMapDataset(defaultGraph);
const planner = new PlanBuilder(dataset);

try {
  for await (const row of planner.build(query)) {
    // row found
  }
  // query completed
} catch (error) {
  // query has errored
}
```

## Alternative Pipelines

Pipelines are used to process results. To use an alternative pipeline, change it before doing anything else with the engine.

```ts
import { Pipeline } from "@jahed/sparql-engine/engine/pipeline/pipeline.ts"
import RxjsPipeline from from "@jahed/sparql-engine/engine/pipeline/rxjs-pipeline.ts"

// Install rxjs to use the RxjsPipeline.
Pipeline.setInstance(new RxjsPipeline());
```

## License

[MIT](LICENSE).

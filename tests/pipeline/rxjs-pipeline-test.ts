// SPDX-License-Identifier: MIT
import RxjsPipeline from "@jahed/sparql-engine/engine/pipeline/rxjs-pipeline.ts";
import { describe } from "node:test";
import testPipelineEngine from "./fixtures.ts";

describe("RxjsPipeline", () => {
  const pipeline = new RxjsPipeline();
  testPipelineEngine(pipeline);
});

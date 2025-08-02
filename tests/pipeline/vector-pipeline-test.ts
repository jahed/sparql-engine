// SPDX-License-Identifier: MIT
import VectorPipeline from "@jahed/sparql-engine/engine/pipeline/vector-pipeline.ts";
import { describe } from "node:test";
import testPipelineEngine from "./fixtures.ts";

describe("VectorPipeline", () => {
  const pipeline = new VectorPipeline();
  testPipelineEngine(pipeline);
});

// SPDX-License-Identifier: MIT
import { describe } from "node:test";
import VectorPipeline from "../../src/engine/pipeline/vector-pipeline.ts";
import testPipelineEngine from "./fixtures.ts";

describe("VectorPipeline", () => {
  const pipeline = new VectorPipeline();
  testPipelineEngine(pipeline);
});

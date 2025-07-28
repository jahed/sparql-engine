// SPDX-License-Identifier: MIT
import { describe } from "node:test";
import RxjsPipeline from "../../src/engine/pipeline/rxjs-pipeline.ts";
import testPipelineEngine from "./fixtures.ts";

describe("RxjsPipeline", () => {
  const pipeline = new RxjsPipeline();
  testPipelineEngine(pipeline);
});

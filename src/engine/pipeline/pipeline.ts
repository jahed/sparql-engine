// SPDX-License-Identifier: MIT
"use strict";

import { PipelineEngine } from "./pipeline-engine.ts";
import RxjsPipeline from "./rxjs-pipeline.ts";

// current pipeline engine used for processing bindings
let _currentEngine: PipelineEngine = new RxjsPipeline();

/**
 * Singleton class used to access the current pipeline engine
 */
export class Pipeline {
  /**
   * Get the instance of the current pipeline engine
   * @return The instance of the current pipeline engine
   */
  static getInstance(): PipelineEngine {
    return _currentEngine;
  }

  /**
   * Set the instance of the current pipeline engine
   * @param instance  - New pipeline engine to use as the current one
   */
  static setInstance(instance: PipelineEngine): void {
    _currentEngine = instance;
  }
}

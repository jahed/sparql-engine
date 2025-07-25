"use strict";

import type { PipelineStage } from "../../engine/pipeline/pipeline-engine.ts";
import type { EngineTriple } from "../../types.ts";

export abstract class Consumable<T> implements PipelineStage<T> {
  abstract execute(): Promise<void>;

  subscribe(
    onData?: (value: T) => void,
    onError?: (err: any) => void,
    onEnd?: () => void
  ): void {
    this.execute().then(onEnd, onError);
  }

  forEach(cb: (value: T) => void): void {
    this.execute();
  }

  pipe<N>(
    fn: (source: PipelineStage<T>) => PipelineStage<N>
  ): PipelineStage<N> {
    throw new Error("Method not implemented.");
  }
}

export class ErrorConsumable<T> extends Consumable<T> {
  private readonly _reason: Error;

  constructor(reason: string) {
    super();
    this._reason = new Error(reason);
  }

  execute(): Promise<void> {
    return Promise.reject(this._reason);
  }
}

export abstract class Consumer<T> extends Consumable<T> {
  private readonly _source: PipelineStage<EngineTriple>;

  constructor(source: PipelineStage<EngineTriple>) {
    super();
    this._source = source;
  }

  execute(): Promise<void> {
    return new Promise((resolve, reject) => {
      const promises: Promise<void>[] = [];
      this._source.subscribe(
        (triple) => {
          promises.push(this.onData(triple));
        },
        reject,
        () => {
          Promise.all(promises).then(() => resolve(), reject);
        }
      );
    });
  }

  abstract onData(triple: EngineTriple): Promise<void>;
}

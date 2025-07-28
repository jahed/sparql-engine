import {
  createObserver,
  createSubscription,
  type PipelineObserver,
  type PipelineObserverOrNext,
  type PipelineStage,
  type PipelineSubscription,
} from "../../engine/pipeline/pipeline-engine.ts";
import type { EngineTriple } from "../../types.ts";

export abstract class Consumable<T> implements PipelineStage<T> {
  abstract execute(): Promise<void>;

  subscribe(
    observerOrNext: PipelineObserverOrNext<T>,
    onError?: PipelineObserver<T>["error"],
    onComplete?: PipelineObserver<T>["complete"]
  ): PipelineSubscription {
    const observer = createObserver(observerOrNext, onError, onComplete);
    this.execute().then(observer.complete, observer.error);
    return createSubscription();
  }

  forEach(cb: (value: T) => void): void {
    this.execute();
  }

  pipe<N>(
    fn: (source: PipelineStage<T>) => PipelineStage<N>
  ): PipelineStage<N> {
    return fn(this);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    await this.execute();
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

  async execute(): Promise<void> {
    for await (const data of this._source) {
      this.onData(data);
    }
  }

  abstract onData(triple: EngineTriple): Promise<void>;
}

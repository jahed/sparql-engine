// SPDX-License-Identifier: MIT
import { chunk, flatMap, flatten, slice } from "lodash-es";
import {
  type PipelineInput,
  type PipelineObserverOrNext,
  type PipelineStage,
  type PipelineSubscription,
  type StreamPipelineInput,
  createObserver,
  createSubscription,
  PipelineEngine,
} from "./pipeline-engine.ts";

/**
 * A PipelineStage which materializes all intermediate results in main memory.
 */
export class VectorStage<T> implements PipelineStage<T> {
  // We need to use Promise to store the stage content,
  // as some computations can require asynchronous computations.
  // For example, the RDF graph can send HTTP requests to evaluate triple patterns.
  private readonly _content: Promise<Array<T>>;

  constructor(content: Promise<Array<T>>) {
    this._content = content;
  }

  getContent(): Promise<Array<T>> {
    return this._content;
  }

  subscribe(observerOrNext: PipelineObserverOrNext<T>): PipelineSubscription {
    const observer = createObserver(observerOrNext);
    try {
      this._content
        .then((c) => {
          if (observer.next) c.forEach(observer.next);
          if (observer.complete) observer.complete();
        })
        .catch(observer.error);
    } catch (e) {
      if (observer.error) observer.error(e);
    }
    return createSubscription();
  }

  forEach(cb: (value: T) => void): void {
    this._content
      .then((c) => {
        c.forEach(cb);
      })
      .catch((err) => {
        throw err;
      });
  }

  pipe<N>(
    fn: (source: PipelineStage<T>) => PipelineStage<N>
  ): PipelineStage<N> {
    return fn(this);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for (const v of await this._content) {
      yield v;
    }
  }
}

export class VectorStreamInput<T> implements StreamPipelineInput<T> {
  private readonly _resolve: (value: T[]) => void;
  private readonly _reject: (err: any) => void;
  private _content: Array<T>;

  constructor(resolve: any, reject: any) {
    this._resolve = resolve;
    this._reject = reject;
    this._content = [];
  }

  next(value: T): void {
    this._content.push(value);
  }

  error(err: any): void {
    this._reject(err);
  }

  complete(): void {
    this._resolve(this._content);
  }
}

/**
 * A pipeline implemented using {@link VectorStage}, *i.e.*, all intermediate results are materialized in main memory. This approach is often called **vectorized approach**.
 * This pipeline is more efficient CPU-wise than {@link RxjsPipeline}, but it also consumes much more memory, as it materializes evey stage of the pipeline before moving to the next.
 * It should only be used when SPARQL queries generate few intermediate results.
 * @see P. A. Boncz, S. Manegold, and M. L. Kersten. "Database architecture evolution: Mammals flourished long before dinosaurs became extinct". PVLDB, (2009)
 */
export default class VectorPipeline extends PipelineEngine {
  empty<T>(): VectorStage<T> {
    return new VectorStage<T>(Promise.resolve([]));
  }

  of<T>(...values: T[]): VectorStage<T> {
    return new VectorStage<T>(Promise.resolve(values));
  }

  async getContent<T>(x: PipelineInput<T>): Promise<T[]> {
    if ("getContent" in x) {
      return (x as VectorStage<T>).getContent();
    } else if (Array.isArray(x)) {
      return Promise.resolve(x);
    } else if (x instanceof Promise) {
      const v = await x;
      return [v];
    } else if (Symbol.iterator in x) {
      return Promise.resolve(Array.from(x));
    }
    throw new Error("Invalid argument: " + x);
  }

  from<T>(x: PipelineInput<T>): VectorStage<T> {
    return new VectorStage<T>(this.getContent(x));
  }

  fromAsync<T>(cb: (input: StreamPipelineInput<T>) => void): VectorStage<T> {
    return new VectorStage<T>(
      new Promise<T[]>((resolve, reject) => {
        cb(new VectorStreamInput<T>(resolve, reject));
      })
    );
  }

  clone<T>(stage: VectorStage<T>): VectorStage<T> {
    return new VectorStage<T>(stage.getContent().then((c) => c.slice(0)));
  }

  catch<T, O>(
    input: VectorStage<T>,
    handler?: (err: Error) => VectorStage<O>
  ): VectorStage<T | O> {
    return new VectorStage<T | O>(
      new Promise((resolve, reject) => {
        input
          .getContent()
          .then((c) => resolve(c.slice(0)))
          .catch((err) => {
            if (handler === undefined) {
              reject(err);
            } else {
              handler(err)
                .getContent()
                .then((c) => resolve(c.slice(0)))
                .catch((err) => {
                  throw err;
                });
            }
          });
      })
    );
  }

  merge<T>(
    ...inputs: Array<VectorStage<T> | PipelineInput<T>>
  ): VectorStage<T> {
    return new VectorStage<T>(
      Promise.all(inputs.map((input) => this.getContent(input))).then(
        (contents) => flatten(contents)
      )
    );
  }

  map<F, T>(input: VectorStage<F>, mapper: (value: F) => T): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then((c) => c.map(mapper)));
  }

  flatMap<F, T>(
    input: VectorStage<F>,
    mapper: (value: F) => T[]
  ): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((c) => flatMap(c, mapper))
    );
  }

  mergeMap<F, T>(
    input: VectorStage<F>,
    mapper: (value: F) => VectorStage<T>
  ): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then(async (content) => {
        let result: T[] = [];
        for (const item of content) {
          const mapped = mapper(item);
          result = result.concat(await mapped.getContent());
        }
        return result;
      })
    );
  }

  mergeMapAsync<F, T>(
    input: VectorStage<F>,
    mapper: (value: F) => VectorStage<T> | Promise<VectorStage<T>>
  ): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then(async (content) => {
        let result: T[] = [];
        for (const item of content) {
          const mapped = await mapper(item);
          result = result.concat(await mapped.getContent());
        }
        return result;
      })
    );
  }

  filter<T>(
    input: VectorStage<T>,
    predicate: (value: T) => boolean
  ): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((c) => c.filter(predicate))
    );
  }

  filterAsync<T>(
    input: VectorStage<T>,
    predicate: (value: T) => boolean | Promise<boolean>
  ): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then(async (c) => {
        const results = [];
        for (const item of c) {
          if (await predicate(item)) {
            results.push(item);
          }
        }
        return results;
      })
    );
  }

  finalize<T>(input: VectorStage<T>, callback: () => void): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((c) => {
        callback();
        return c;
      })
    );
  }

  reduce<F, T>(
    input: VectorStage<F>,
    reducer: (acc: T, value: F) => T,
    initial: T
  ): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((c) => [c.reduce(reducer, initial)])
    );
  }

  limit<T>(input: VectorStage<T>, stopAfter: number): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((c) => slice(c, 0, stopAfter))
    );
  }

  skip<T>(input: VectorStage<T>, toSkip: number): VectorStage<T> {
    return new VectorStage<T>(input.getContent().then((c) => slice(c, toSkip)));
  }

  defaultValues<T>(input: VectorStage<T>, ...values: T[]): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((content) => {
        if (content.length > 0) {
          return content.slice(0);
        }
        return values;
      })
    );
  }

  bufferCount<T>(input: VectorStage<T>, count: number): VectorStage<T[]> {
    return new VectorStage<T[]>(
      input.getContent().then((c) => chunk(c, count))
    );
  }

  forEach<T>(input: VectorStage<T>, cb: (value: T) => void): void {
    input.forEach(cb);
  }

  first<T>(input: VectorStage<T>): VectorStage<T> {
    return new VectorStage<T>(
      input.getContent().then((content) => {
        if (content.length < 1) {
          return [];
        }
        return [content[0]];
      })
    );
  }

  collect<T>(input: VectorStage<T>): VectorStage<T[]> {
    return new VectorStage<T[]>(input.getContent().then((c) => [c]));
  }
}

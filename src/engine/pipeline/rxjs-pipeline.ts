// SPDX-License-Identifier: MIT
import {
  bufferCount,
  catchError,
  concat,
  defaultIfEmpty,
  distinct,
  EMPTY,
  endWith,
  filter,
  finalize,
  first,
  from,
  map,
  mergeMap,
  Observable,
  of,
  reduce,
  shareReplay,
  skip,
  Subscriber,
  type Subscription,
  take,
  tap,
  toArray,
} from "rxjs";
import {
  PipelineEngine,
  type PipelineObserver,
  type PipelineObserverOrNext,
  type StreamPipelineInput,
} from "./pipeline-engine.ts";

const flatMap = mergeMap;

declare module "rxjs" {
  export interface Observable<T> {
    subscribe(
      observerOrNext: PipelineObserverOrNext<T>,
      onError?: PipelineObserver<T>["error"],
      onComplete?: PipelineObserver<T>["complete"]
    ): Subscription;
  }
}

const originalSubscribe = Observable.prototype.subscribe;
Observable.prototype.subscribe = function subscribe<T>(
  observerOrNext: PipelineObserverOrNext<T>,
  onError?: PipelineObserver<T>["error"],
  onComplete?: PipelineObserver<T>["complete"]
): Subscription {
  if (onError || onComplete) {
    return originalSubscribe.call(this, {
      next: typeof observerOrNext === "function" ? observerOrNext : undefined,
      error: onError,
      complete: onComplete,
    });
  }
  return originalSubscribe.call(this, observerOrNext);
};

/**
 * A StreamPipelineInput implemented using Rxjs' subscribers.
 */
export class RxjsStreamInput<T> implements StreamPipelineInput<T> {
  private readonly _subscriber: Subscriber<T>;

  constructor(subscriber: Subscriber<T>) {
    this._subscriber = subscriber;
  }

  next(value: T): void {
    this._subscriber.next(value);
  }

  complete(): void {
    this._subscriber.complete();
  }

  error(err: any): void {
    this._subscriber.error(err);
  }
}

/**
 * A pipeline implemented using Rx.js
 */
export default class RxjsPipeline extends PipelineEngine {
  empty<T>(): Observable<T> {
    return EMPTY;
  }

  of<T>(...values: T[]): Observable<T> {
    return of(...values);
  }

  from(x: any): Observable<any> {
    return from(x);
  }

  fromAsync<T>(cb: (input: StreamPipelineInput<T>) => void): Observable<T> {
    return new Observable<T>((subscriber) =>
      cb(new RxjsStreamInput(subscriber))
    );
  }

  clone<T>(stage: Observable<T>): Observable<T> {
    return stage.pipe(shareReplay(5));
  }

  catch<T, O>(
    input: Observable<T>,
    handler?: (err: Error) => Observable<O>
  ): Observable<T | O> {
    return input.pipe(
      catchError((err) => {
        if (handler === undefined) {
          throw err;
        } else {
          return handler(err);
        }
      })
    );
  }

  merge<T>(...inputs: Array<Observable<T>>): Observable<T> {
    return concat(...inputs);
  }

  map<F, T>(input: Observable<F>, mapper: (value: F) => T): Observable<T> {
    return input.pipe(map(mapper));
  }

  flatMap<F, T>(
    input: Observable<F>,
    mapper: (value: F) => T[]
  ): Observable<T> {
    return input.pipe(flatMap(mapper));
  }

  mergeMap<F, T>(
    input: Observable<F>,
    mapper: (value: F) => Observable<T>
  ): Observable<T> {
    return input.pipe(mergeMap(mapper));
  }

  mergeMapAsync<F, T>(
    input: Observable<F>,
    mapper: (value: F) => Observable<T> | Promise<Observable<T>>
  ): Observable<T> {
    return input.pipe(
      mergeMap((v) => from(Promise.resolve(mapper(v))).pipe(mergeMap((n) => n)))
    );
  }

  filter<T>(
    input: Observable<T>,
    predicate: (value: T) => boolean
  ): Observable<T> {
    return input.pipe(filter(predicate));
  }

  filterAsync<T>(
    input: Observable<T>,
    predicate: (value: T) => boolean | Promise<boolean>
  ): Observable<T> {
    return input.pipe(
      flatMap((v) =>
        from(Promise.resolve(predicate(v))).pipe(
          filter((b) => b),
          map(() => v)
        )
      )
    );
  }

  finalize<T>(input: Observable<T>, callback: () => void): Observable<T> {
    return input.pipe(finalize(callback));
  }

  reduce<F, T>(
    input: Observable<F>,
    reducer: (acc: T, value: F) => T,
    initial: T
  ): Observable<T> {
    return input.pipe(reduce(reducer, initial));
  }

  limit<T>(input: Observable<T>, stopAfter: number): Observable<T> {
    return input.pipe(take(stopAfter));
  }

  skip<T>(input: Observable<T>, toSkip: number): Observable<T> {
    return input.pipe(skip(toSkip));
  }

  distinct<T, K>(
    input: Observable<T>,
    selector?: (value: T) => T | K
  ): Observable<T> {
    return input.pipe(distinct(selector));
  }

  defaultValues<T>(input: Observable<T>, ...values: T[]): Observable<T> {
    if (values.length === 0) {
      return input;
    } else if (values.length === 1) {
      return input.pipe(defaultIfEmpty(values[0]));
    } else {
      return new Observable<T>((subscriber) => {
        let isEmpty: boolean = true;
        return input.subscribe({
          next: (x: T) => {
            isEmpty = false;
            subscriber.next(x);
          },
          error: (err) => subscriber.error(err),
          complete: () => {
            if (isEmpty) {
              values.forEach((v: T) => subscriber.next(v));
            }
            subscriber.complete();
          },
        });
      });
    }
  }

  bufferCount<T>(input: Observable<T>, count: number): Observable<T[]> {
    return input.pipe(bufferCount(count));
  }

  forEach<T>(input: Observable<T>, cb: (value: T) => void): void {
    input
      .forEach(cb)
      .then()
      .catch((err) => {
        throw err;
      });
  }

  first<T>(input: Observable<T>): Observable<T> {
    return input.pipe(first());
  }

  endWith<T>(input: Observable<T>, values: T[]): Observable<T> {
    return input.pipe(endWith(...values));
  }

  tap<T>(input: Observable<T>, cb: (value: T) => void): Observable<T> {
    return input.pipe(tap(cb));
  }

  collect<T>(input: Observable<T>): Observable<T[]> {
    return input.pipe(toArray());
  }
}

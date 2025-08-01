// SPDX-License-Identifier: MIT
import { Consumable } from "./consumer.ts";

/**
 * ManyConsumers group multiple {@link Consumable} to be evaluated in sequence
 */
export default class ManyConsumers<T> extends Consumable<T> {
  private readonly _consumers: Consumable<T>[];

  /**
   * Constructor
   * @param consumers - Set of consumables
   */
  constructor(consumers: Consumable<T>[]) {
    super();
    this._consumers = consumers;
  }

  execute(): Promise<void> {
    if (this._consumers.length === 1) {
      return this._consumers[0].execute();
    }
    return this._consumers.reduce((prev, consumer) => {
      return prev.then(() => consumer.execute());
    }, Promise.resolve());
  }
}

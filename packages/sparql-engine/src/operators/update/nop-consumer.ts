// SPDX-License-Identifier: MIT
import { Consumable } from "./consumer.ts";

/**
 * A Consumer that does nothing
 */
export default class NoopConsumer<T> extends Consumable<T> {
  execute(): Promise<void> {
    return Promise.resolve();
  }
}

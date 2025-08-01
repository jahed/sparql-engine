// SPDX-License-Identifier: MIT
import { Consumable } from "./consumer.ts";

/**
 * A consumer that executes a simple action
 */
export default class ActionConsumer<T> extends Consumable<T> {
  private _action: () => void;

  constructor(action: () => void) {
    super();
    this._action = action;
  }

  execute(): Promise<void> {
    return new Promise((resolve) => {
      this._action();
      resolve();
    });
  }
}

export class AsyncLocalStorage<T = unknown> {
  private store: T | undefined;

  constructor() {
    this.store = undefined;
  }

  run(store: T, callback: () => T) {
    const previous = this.store;
    this.store = store;
    try {
      return callback();
    } finally {
      this.store = previous;
    }
  }

  getStore(): T | undefined {
    return this.store;
  }
}

import type { CancellationToken, FlowOptions } from '../types.js';
import { CancellationTokenSource } from '../cancellation/index.js';

/**
 * Executes an async flow with optional timeout and retry logic
 */
export class AsyncFlow {
  /**
   * Execute an async operation with timeout and retry support
   */
  static async execute<T>(
    operation: (token: CancellationToken) => Promise<T>,
    options: FlowOptions = {}
  ): Promise<T> {
    const { timeout, maxRetries = 1, onError } = options;

    const source = new CancellationTokenSource();
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeout) {
      timer = setTimeout(() => source.cancel('timeout'), timeout);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation(source.token);
        if (timer) clearTimeout(timer);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (onError) {
          try {
            await Promise.resolve(onError(lastError));
          } catch (_) {
            // Ignore errors in onError callback
          }
        }

        if (attempt < maxRetries - 1 && !source.token.isCancellationRequested) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        } else {
          if (timer) clearTimeout(timer);
          break;
        }
      }
    }

    throw lastError || new Error('AsyncFlow failed after retries');
  }

  /**
   * Race multiple async operations
   */
  static async race<T>(
    operations: ((token: CancellationToken) => Promise<T>)[],
    timeout?: number
  ): Promise<T> {
    const source = new CancellationTokenSource();
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeout) {
      timer = setTimeout(() => source.cancel('timeout'), timeout);
    }

    try {
      return await Promise.race(operations.map((op) => op(source.token)));
    } finally {
      if (timer) clearTimeout(timer);
      source.cancel('other');
    }
  }

  /**
   * Execute operations sequentially
   */
  static async sequence<T>(
    operations: ((token: CancellationToken) => Promise<T>)[],
    options: FlowOptions = {}
  ): Promise<T[]> {
    const { timeout } = options;
    const source = new CancellationTokenSource();
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeout) {
      timer = setTimeout(() => source.cancel('timeout'), timeout);
    }

    const results: T[] = [];

    try {
      for (const operation of operations) {
        if (source.token.isCancellationRequested) {
          break;
        }
        try {
          const result = await operation(source.token);
          results.push(result);
        } catch (error) {
          source.cancel('error');
          throw error;
        }
      }
    } finally {
      if (timer) clearTimeout(timer);
    }

    return results;
  }

  /**
   * Execute operations in parallel with concurrency limit
   */
  static async parallel<T>(
    operations: ((token: CancellationToken) => Promise<T>)[],
    concurrency: number = 5,
    options: FlowOptions = {}
  ): Promise<T[]> {
    const { timeout } = options;
    const source = new CancellationTokenSource();
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeout) {
      timer = setTimeout(() => source.cancel('timeout'), timeout);
    }

    const results = new Array<T>(operations.length);
    const executing: Promise<void>[] = [];

    try {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const index = i;

        const promise = Promise.resolve().then(async () => {
          if (source.token.isCancellationRequested) {
            return;
          }
          try {
            results[index] = await operation(source.token);
          } catch (error) {
            source.cancel('error');
            throw error;
          }
        }).finally(() => {
          const idx = executing.indexOf(promise);
          if (idx > -1) {
            executing.splice(idx, 1);
          }
        });

        executing.push(promise);

        if (executing.length >= concurrency) {
          await Promise.race(executing);
        }
      }

      await Promise.all(executing);
    } finally {
      if (timer) clearTimeout(timer);
    }

    return results;
  }
}

/**
 * Create a deferred promise for manual resolution
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

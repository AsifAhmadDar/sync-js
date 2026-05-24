import type { CancellationToken, FlowOptions } from '../types.js';
import { CancellationTokenSource, createTimeoutToken } from '../cancellation/index.js';

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

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = timeout ? createTimeoutToken(timeout) : new CancellationTokenSource().token;

        const result = await operation(token);
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

        if (attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
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
    const token = timeout ? createTimeoutToken(timeout) : source.token;

    try {
      return await Promise.race(operations.map((op) => op(token)));
    } finally {
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
    const token = timeout ? createTimeoutToken(timeout) : source.token;

    const results: T[] = [];

    for (const operation of operations) {
      if (token.isCancellationRequested) {
        break;
      }
      try {
        const result = await operation(token);
        results.push(result);
      } catch (error) {
        source.cancel('error');
        throw error;
      }
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
    const token = timeout ? createTimeoutToken(timeout) : source.token;

    const results: T[] = new Array(operations.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const index = i;

      const promise = Promise.resolve().then(async () => {
        if (token.isCancellationRequested) {
          return;
        }
        try {
          results[index] = await operation(token);
        } catch (error) {
          source.cancel('error');
          throw error;
        }
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
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

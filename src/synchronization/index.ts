import type { SynchronizationOptions } from '../types.js';


/**
 * A mutual exclusion lock for synchronizing concurrent access
 */
export class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  /**
   * Acquire the lock and execute a callback
   */
  async lock<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        this.locked = true;
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            next();
          }
        }
      };

      if (this.locked) {
        this.queue.push(() => { void execute(); });
      } else {
        void execute();
      }
    });
  }

  /**
   * Check if the mutex is locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Get the queue length
   */
  queueLength(): number {
    return this.queue.length;
  }
}

/**
 * A semaphore for limiting concurrent access
 */
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * Acquire a permit and execute a callback
   */
  async acquire<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        this.permits--;
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.permits++;
          const next = this.queue.shift();
          if (next) {
            next();
          }
        }
      };

      if (this.permits > 0) {
        void execute();
      } else {
        this.queue.push(() => { void execute(); });
      }
    });
  }

  /**
   * Get available permits
   */
  availablePermits(): number {
    return this.permits;
  }

  /**
   * Get queue length
   */
  queueLength(): number {
    return this.queue.length;
  }
}

/**
 * A barrier for synchronizing multiple operations
 */
export class Barrier {
  private count: number;
  private current = 0;
  private waiters: Array<() => void> = [];

  constructor(count: number) {
    if (count <= 0) {
      throw new Error('Barrier count must be greater than 0');
    }
    this.count = count;
  }

  /**
   * Wait for all operations to reach the barrier
   */
  async wait(): Promise<void> {
    this.current++;

    if (this.current >= this.count) {
      this.current = 0;
      const waiting = this.waiters;
      this.waiters = [];
      waiting.forEach((resolve) => resolve());
      return;
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /**
   * Reset the barrier
   */
  reset(): void {
    this.current = 0;
  }
}

/**
 * A condition variable for coordinating synchronization
 */
export class ConditionVariable {
  private mutex = new Mutex();
  private waiters: Array<() => void> = [];

  /**
   * Wait for a condition
   */
  async wait<T>(predicate: () => boolean, callback: () => Promise<T>): Promise<T> {
    return this.mutex.lock(async () => {
      while (!predicate()) {
        await new Promise<void>((resolve) => {
          this.waiters.push(resolve);
        });
      }
      return callback();
    });
  }

  /**
   * Notify all waiters
   */
  notifyAll(): void {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }

  /**
   * Notify one waiter
   */
  notifyOne(): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter();
    }
  }
}

/**
 * A data structure for resolving conflicts in synchronization
 */
export class ConflictResolver<T> {
  private version = 0;
  private data: T;
  private locks: Map<string, number> = new Map();
  private options: SynchronizationOptions;

  constructor(initialData: T, options: SynchronizationOptions = {}) {
    this.data = initialData;
    this.options = options;
  }

  /**
   * Acquire a lock on a resource
   */
  acquireLock(resourceId: string): number {
    const lockId = this.version++;
    this.locks.set(resourceId, lockId);
    return lockId;
  }

  /**
   * Release a lock
   */
  releaseLock(resourceId: string, lockId: number): boolean {
    const currentLock = this.locks.get(resourceId);
    if (currentLock === lockId) {
      this.locks.delete(resourceId);
      return true;
    }
    return false;
  }

  /**
   * Check if a lock is held
   */
  isLocked(resourceId: string): boolean {
    return this.locks.has(resourceId);
  }

  /**
   * Get current data
   */
  getData(): T {
    return this.data;
  }

  /**
   * Update data with conflict detection
   */
  async update(updater: (data: T) => T | Promise<T>): Promise<T> {
    const conflicts: string[] = [];

    for (const [resourceId] of this.locks) {
      conflicts.push(resourceId);
    }

    if (conflicts.length > 0 && this.options.onConflict) {
      await Promise.resolve(this.options.onConflict(conflicts));
    }

    this.data = await Promise.resolve(updater(this.data));
    return this.data;
  }
}

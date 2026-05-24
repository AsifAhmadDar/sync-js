import type { Listener, AsyncListener } from '../types.js';

/**
 * A strongly-typed event emitter with support for async listeners
 */
export class EventBus<TEvents extends Record<string, any> = Record<string, any>> {
  private listeners: Map<keyof TEvents, Set<Listener>> = new Map();
  private asyncListeners: Map<keyof TEvents, Set<AsyncListener>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);

    // Return unsubscribe function
    return () => {
      set.delete(listener as Listener);
    };
  }

  /**
   * Subscribe to an event with async support
   */
  onAsync<K extends keyof TEvents>(event: K, listener: AsyncListener<TEvents[K]>): () => void {
    if (!this.asyncListeners.has(event)) {
      this.asyncListeners.set(event, new Set());
    }
    const set = this.asyncListeners.get(event)!;
    set.add(listener as AsyncListener);

    // Return unsubscribe function
    return () => {
      set.delete(listener as AsyncListener);
    };
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
    const unsubscribe = this.on(event, ((e: TEvents[K]) => {
      unsubscribe();
      return listener(e);
    }) as Listener<TEvents[K]>);

    return unsubscribe;
  }

  /**
   * Emit an event synchronously
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in listener for event ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Emit an event asynchronously
   */
  async emitAsync<K extends keyof TEvents>(event: K, data: TEvents[K]): Promise<void> {
    const syncListeners = this.listeners.get(event);
    const asyncListeners = this.asyncListeners.get(event);

    // Execute sync listeners first
    if (syncListeners) {
      syncListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in listener for event ${String(event)}:`, error);
        }
      });
    }

    // Execute async listeners
    if (asyncListeners) {
      await Promise.all(
        Array.from(asyncListeners).map(async (listener) => {
          try {
            await listener(data);
          } catch (error) {
            console.error(`Error in async listener for event ${String(event)}:`, error);
          }
        })
      );
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event !== undefined) {
      this.listeners.delete(event);
      this.asyncListeners.delete(event);
    } else {
      this.listeners.clear();
      this.asyncListeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const syncCount = this.listeners.get(event)?.size ?? 0;
    const asyncCount = this.asyncListeners.get(event)?.size ?? 0;
    return syncCount + asyncCount;
  }
}

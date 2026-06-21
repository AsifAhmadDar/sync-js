import type { LifecycleHook } from '../types.js';

/**
 * Manages lifecycle hooks for an application or component
 */
export class LifecycleManager {
  private hooks: Map<string, Map<number, LifecycleHook>> = new Map();
  private nextId = 0;

  /**
   * Register a hook for a lifecycle event
   */
  on(event: string, hook: LifecycleHook): () => void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, new Map());
    }

    const id = this.nextId++;
    this.hooks.get(event)!.set(id, hook);

    // Return unregister function
    return () => {
      this.hooks.get(event)?.delete(id);
    };
  }

  /**
   * Trigger a lifecycle event
   */
  async emit(event: string): Promise<void> {
    const hooks = this.hooks.get(event);
    if (!hooks) return;

    for (const hook of hooks.values()) {
      try {
        await Promise.resolve(hook());
      } catch (error) {
        console.error(`Error in ${event} hook:`, error);
        throw error;
      }
    }
  }

  /**
   * Trigger a lifecycle event with error suppression
   */
  async emitSafe(event: string): Promise<void> {
    const hooks = this.hooks.get(event);
    if (!hooks) return;

    for (const hook of hooks.values()) {
      try {
        await Promise.resolve(hook());
      } catch (error) {
        console.error(`Error in ${event} hook:`, error);
      }
    }
  }

  /**
   * Get the count of hooks for an event
   */
  count(event: string): number {
    return this.hooks.get(event)?.size ?? 0;
  }

  /**
   * Clear all hooks for an event
   */
  clear(event?: string): void {
    if (event !== undefined) {
      this.hooks.delete(event);
    } else {
      this.hooks.clear();
    }
  }
}

/**
 * A utility class for managing common application lifecycle events
 */
export class ApplicationLifecycle extends LifecycleManager {
  /**
   * Register an initialization hook
   */
  onInit(hook: LifecycleHook): () => void {
    return this.on('init', hook);
  }

  /**
   * Register a start hook
   */
  onStart(hook: LifecycleHook): () => void {
    return this.on('start', hook);
  }

  /**
   * Register a ready hook
   */
  onReady(hook: LifecycleHook): () => void {
    return this.on('ready', hook);
  }

  /**
   * Register a shutdown hook
   */
  onShutdown(hook: LifecycleHook): () => void {
    return this.on('shutdown', hook);
  }

  /**
   * Register a destroy hook
   */
  onDestroy(hook: LifecycleHook): () => void {
    return this.on('destroy', hook);
  }

  /**
   * Trigger init event
   */
  async init(): Promise<void> {
    await this.emit('init');
  }

  /**
   * Trigger start event
   */
  async start(): Promise<void> {
    await this.emit('start');
  }

  /**
   * Trigger ready event
   */
  async ready(): Promise<void> {
    await this.emit('ready');
  }

  /**
   * Trigger shutdown event
   */
  async shutdown(): Promise<void> {
    await this.emitSafe('shutdown');
  }

  /**
   * Trigger destroy event
   */
  async destroy(): Promise<void> {
    await this.emitSafe('destroy');
  }
}

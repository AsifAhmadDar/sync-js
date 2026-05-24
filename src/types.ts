/**
 * Core types and interfaces for sync-js
 */

export interface Listener<T = unknown> {
  (event: T): void | Promise<void>;
}

export interface AsyncListener<T = unknown> {
  (event: T): Promise<void>;
}

export interface Middleware<TContext = Record<string, unknown>> {
  (context: TContext, next: () => Promise<void>): Promise<void>;
}

export interface LifecycleHook {
  (): void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type CancellationReason = 'user' | 'timeout' | 'error' | 'other' | string;

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly reason?: CancellationReason;
  onCancellationRequested(callback: (reason: CancellationReason) => void): void;
}

export interface WorkflowStep {
  name: string;
  execute(): Promise<void>;
  canExecute?: () => boolean;
  retryable?: boolean;
  timeout?: number;
}

export interface WorkflowContext {
  readonly data: Record<string, unknown>;
  readonly cancellationToken: CancellationToken;
  set(key: string, value: unknown): void;
  get(key: string): unknown;
}

export interface FlowOptions {
  timeout?: number;
  maxRetries?: number;
  onError?: (error: Error) => void | Promise<void>;
}

export interface SynchronizationOptions {
  timeout?: number;
  onConflict?: (conflicts: string[]) => unknown;
}

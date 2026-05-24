/**
 * sync-js - A unified, extensible, and TypeScript-first solution
 * for managing application flow and orchestration
 */

// Types
export type {
  Listener,
  AsyncListener,
  Middleware,
  LifecycleHook,
  CancellationReason,
  CancellationToken,
  WorkflowStep,
  WorkflowContext,
  FlowOptions,
  SynchronizationOptions,
} from './types.js';

// Cancellation
export {
  CancellationTokenImpl,
  CancellationTokenSource,
  createTimeoutToken,
  createAggregateToken,
} from './cancellation/index.js';

// Events
export { EventBus } from './events/index.js';

// Middleware
export { MiddlewareChain, createMiddlewareChain, composeMiddlewares } from './middleware/index.js';

// Async Flow
export { AsyncFlow, createDeferred } from './flow/index.js';
export type { Deferred } from './flow/index.js';

// Lifecycle
export { LifecycleManager, ApplicationLifecycle } from './lifecycle/index.js';

// Synchronization
export {
  Mutex,
  Semaphore,
  Barrier,
  ConditionVariable,
  ConflictResolver,
} from './synchronization/index.js';

// Orchestration
export {
  WorkflowOrchestrator,
  WorkflowBuilder,
} from './orchestration/index.js';
export type { WorkflowEvents } from './orchestration/index.js';

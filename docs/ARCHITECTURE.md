# sync-js Architecture

## Overview

sync-js is structured around core primitives for managing application flow. Each module is independent but can be composed for more complex scenarios.

## Module Structure

```
src/
├── types.ts                 # Core interfaces and type definitions
├── cancellation/            # Token-based cancellation system
├── events/                  # Event coordination
├── middleware/              # Middleware chains
├── flow/                    # Async flow management
├── lifecycle/               # Lifecycle hooks
├── orchestration/           # Workflow orchestration
├── synchronization/         # Synchronization primitives
└── index.ts                 # Public API exports
```

## Core Concepts

### 1. Types (`types.ts`)

Defines the fundamental interfaces used throughout the library:

- `Listener<T>` - Synchronous event listener
- `AsyncListener<T>` - Asynchronous event listener
- `Middleware<TContext>` - Middleware function signature
- `LifecycleHook` - Lifecycle callback
- `CancellationToken` - Token-based cancellation
- `WorkflowStep` - Workflow step definition
- `WorkflowContext` - Workflow execution context
- `FlowOptions` - Async flow configuration
- `SynchronizationOptions` - Synchronization configuration

### 2. Cancellation System

**File**: `cancellation/index.ts`

Token-based cancellation inspired by .NET's `CancellationToken`:

```typescript
CancellationTokenImpl
  ├── Manages cancellation state
  ├── Notifies listeners
  └── Provides reason tracking

CancellationTokenSource
  ├── Creates tokens
  └── Triggers cancellation

Utilities:
  ├── createTimeoutToken()      // Auto-cancel after timeout
  └── createAggregateToken()    // Combine multiple tokens
```

**Design Decisions**:
- Tokens are passive (immutable from user perspective)
- Source is active (can trigger cancellation)
- Reasons help with debugging and error recovery
- Separate concerns: token consumers vs. producers

### 3. Event System

**File**: `events/index.ts`

Strongly-typed event emitter with dual-mode support:

```typescript
EventBus<TEvents>
├── Sync listeners (on, emit)
├── Async listeners (onAsync, emitAsync)
├── One-time listeners (once)
└── Listener management
```

**Design Decisions**:
- Strong typing prevents event name typos
- Dual-mode (sync/async) handles different use cases
- Separate listener tracking prevents interference
- Error isolation prevents cascade failures
- Unsubscribe functions simplify cleanup

### 4. Middleware System

**File**: `middleware/index.ts`

Express.js-style middleware chaining:

```typescript
MiddlewareChain<TContext>
├── Sequential execution
├── Automatic chaining
├── Early termination support
└── Error propagation

Utilities:
└── composeMiddlewares() // Flatten multiple chains
```

**Design Decisions**:
- Index-based dispatch prevents double-execution
- Automatic chaining simplifies error handling
- Early termination allows short-circuiting
- Generic context allows maximum flexibility

### 5. Async Flow

**File**: `flow/index.ts`

Comprehensive async operation management:

```typescript
AsyncFlow (static methods)
├── execute()      // Single operation with retry
├── race()         // First completion wins
├── sequence()     // Sequential with early termination
└── parallel()     // Concurrent with limit

Utilities:
└── createDeferred() // Manual promise resolution
```

**Design Decisions**:
- Exponential backoff for retries (100ms * 2^n)
- Concurrency limits prevent resource exhaustion
- Token-based cancellation integrates globally
- Timeout enforcement is consistent

### 6. Lifecycle Management

**File**: `lifecycle/index.ts`

Event-based lifecycle hooks:

```typescript
LifecycleManager
├── Generic hook registration
├── Event-triggered hooks
└── Error modes (throw vs. safe)

ApplicationLifecycle (extends LifecycleManager)
├── Predefined events (init, start, ready, shutdown, destroy)
└── Convenience methods
```

**Design Decisions**:
- Safe emission catches errors in shutdown/destroy
- Generic event names for custom phases
- Easy to extend with custom lifecycles

### 7. Synchronization Primitives

**File**: `synchronization/index.ts`

Classic synchronization constructs:

```typescript
Mutex
├── Lock-based mutual exclusion
└── Queue-based fairness

Semaphore
├── Limited concurrent access
└── Permit tracking

Barrier
├── Multi-party synchronization
└── State reset capability

ConditionVariable
├── Predicate-based waiting
├── Mutex integration
└── Notify one/all

ConflictResolver
├── Resource locking
├── Lock management
└── Conflict detection
```

**Design Decisions**:
- Promise-based instead of callbacks (async/await friendly)
- Queue implementations ensure fairness
- Separate lock and permit tracking prevents errors
- Condition variables include built-in mutex

### 8. Workflow Orchestration

**File**: `orchestration/index.ts`

Complex workflow execution:

```typescript
WorkflowOrchestrator
├── Step execution
├── Event emission
├── Error handling
├── Retry logic
└── Context passing

WorkflowBuilder
├── Fluent interface
├── Step configuration
└── Orchestrator creation

WorkflowContext
├── Data storage
├── Cancellation token
└── Inter-step communication
```

**Design Decisions**:
- Event-driven for observability
- Step retry without workflow retry
- Cancellation token available in context
- Optional execution with canExecute()

## Integration Patterns

### Event + Lifecycle

```typescript
const eventBus = new EventBus<Events>();
const lifecycle = new ApplicationLifecycle();

lifecycle.onStart(async () => {
  await startListening(eventBus);
});
```

### Middleware + Lifecycle

```typescript
const chain = new MiddlewareChain();
const lifecycle = new ApplicationLifecycle();

lifecycle.onInit(async () => {
  chain.use(authMiddleware);
});
```

### AsyncFlow + Cancellation

```typescript
const source = new CancellationTokenSource();

await AsyncFlow.execute(
  async (token) => { /* ... */ },
  { /* options */ }
);
```

### Workflow + Events

```typescript
const workflow = new WorkflowOrchestrator();
const eventBus = new EventBus<WorkflowEvents>();

workflow.on('stepComplete', (event) => {
  eventBus.emit('step-complete', event);
});
```

## Performance Considerations

### Memory

- Listener storage is lazy (creates Map only when needed)
- Middleware uses closures efficiently
- No external buffer allocations in hot paths

### CPU

- Exponential backoff prevents busy-waiting
- Parallel execution with concurrency limits
- Early termination prevents unnecessary work

### Scalability

- Event emitter handles thousands of listeners
- Middleware chains compose without overhead
- Workflow steps execute sequentially (no queuing)
- Synchronization primitives use efficient algorithms

## Error Handling Strategy

1. **Listener Errors**: Caught and logged, don't affect other listeners
2. **Middleware Errors**: Propagate to caller
3. **Async Flow Errors**: Configurable retry/fail
4. **Lifecycle Errors**: Safe mode for shutdown
5. **Workflow Errors**: Event emission before throw
6. **Sync Primitive Errors**: Reject promise

## Type Safety

- Strict TypeScript mode enabled
- No implicit `any` types
- Full type coverage for public API
- Generic constraints for type parameters

## Testing Strategy

- Unit tests for each module
- Integration tests for patterns
- Example code in `/examples`
- Property-based tests for edge cases

## Extensibility Points

Users can extend through:

1. **Event Bus**: Create typed interfaces
2. **Middleware**: Compose custom chains
3. **Lifecycle**: Custom event names
4. **Workflow**: Custom step configurations
5. **Synchronization**: Mutex subclasses
6. **Cancellation**: Custom token sources

## Future Enhancements

Potential additions:
- Advanced retry strategies (exponential, jitter, etc.)
- Metrics and monitoring hooks
- Distributed cancellation tokens
- Transaction support for workflows
- Resource pooling for semaphores

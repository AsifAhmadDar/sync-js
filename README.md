# sync-js

A unified, extensible, and **TypeScript-first** solution for managing application flow and orchestration.

Modern applications constantly deal with:
- **Event coordination** - coordinating complex event flows across your application
- **Async flows** - managing asynchronous operations with retry logic and error handling
- **Middleware chains** - building composable request/response pipelines
- **Lifecycle hooks** - managing application initialization, startup, and shutdown phases
- **Workflow orchestration** - executing complex multi-step workflows reliably
- **Synchronization problems** - coordinating concurrent access to shared resources
- **Cancellation logic** - gracefully cancelling long-running operations

Most developers repeatedly build custom event systems for these problems. **sync-js** provides battle-tested, production-ready implementations of these patterns.

## Features

✨ **Event Coordination** - Strongly typed event emitter with sync and async listeners
🔄 **Async Flows** - Execute async operations with retry, timeout, and cancellation support
🧩 **Middleware Chains** - Composable middleware with automatic chaining and error handling
🔁 **Lifecycle Management** - Application lifecycle hooks for init, start, ready, shutdown, and destroy
🎯 **Workflow Orchestration** - Execute complex workflows with step retries, timeouts, and event tracking
🔒 **Synchronization** - Mutex, Semaphore, Barrier, and ConditionVariable for thread-safe operations
❌ **Cancellation Tokens** - Graceful cancellation with timeout support and aggregate tokens

## Installation

```bash
npm install @sync-js/core
```

## Quick Start

### Event Coordination

```typescript
import { EventBus } from '@sync-js/core';

interface AppEvents {
  userLogin: { userId: string };
  error: { message: string };
}

const eventBus = new EventBus<AppEvents>();

// Subscribe to events
eventBus.on('userLogin', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

// Emit events
eventBus.emit('userLogin', { userId: 'user123' });

// Async listeners
eventBus.onAsync('userLogin', async ({ userId }) => {
  await saveToDatabase(userId);
});

await eventBus.emitAsync('userLogin', { userId: 'user456' });
```

### Async Flows

```typescript
import { AsyncFlow } from '@sync-js/core';

// Execute with retry and timeout
const result = await AsyncFlow.execute(
  async (token) => {
    // Check cancellation
    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }
    return fetchData();
  },
  {
    timeout: 5000,
    maxRetries: 3,
    onError: async (error) => console.log('Attempt failed:', error),
  }
);

// Run operations in parallel with concurrency limit
const results = await AsyncFlow.parallel(
  [
    (token) => fetchUser(1, token),
    (token) => fetchUser(2, token),
    (token) => fetchUser(3, token),
  ],
  2 // max 2 concurrent
);

// Race multiple operations
const fastest = await AsyncFlow.race([
  (token) => fetchFromServer1(token),
  (token) => fetchFromServer2(token),
]);
```

### Middleware Chains

```typescript
import { MiddlewareChain } from '@sync-js/core';

interface Request {
  path: string;
  headers: Record<string, string>;
}

const chain = new MiddlewareChain<Request>();

chain
  .use(async (req, next) => {
    console.log(`→ ${req.path}`);
    await next();
    console.log(`← ${req.path}`);
  })
  .use(async (req, next) => {
    if (!req.headers['authorization']) {
      throw new Error('Unauthorized');
    }
    await next();
  });

await chain.execute({ path: '/api/users', headers: {} });
```

### Lifecycle Hooks

```typescript
import { ApplicationLifecycle } from '@sync-js/core';

const app = new ApplicationLifecycle();

app.onInit(async () => {
  console.log('Initializing...');
  await loadConfig();
});

app.onStart(async () => {
  console.log('Starting server...');
  await startServer();
});

app.onReady(async () => {
  console.log('Server ready!');
});

app.onShutdown(async () => {
  console.log('Graceful shutdown...');
  await closeConnections();
});

await app.init();
await app.start();
await app.ready();
// ...
await app.shutdown();
```

### Workflow Orchestration

```typescript
import { WorkflowBuilder } from '@sync-js/core';

const workflow = new WorkflowBuilder()
  .step('validate', async () => {
    console.log('Validating data...');
  })
  .step('transform', async () => {
    console.log('Transforming...');
  })
  .step('save', async () => {
    console.log('Saving...');
  })
  .build();

// Subscribe to events
workflow.on('stepStart', ({ step }) => {
  console.log(`Starting: ${step}`);
});

workflow.on('stepComplete', ({ step, duration }) => {
  console.log(`Completed: ${step} (${duration}ms)`);
});

workflow.on('stepError', ({ step, error }) => {
  console.error(`Failed: ${step}`, error);
});

// Execute
await workflow.execute();
```

### Synchronization

```typescript
import { Mutex, Semaphore, Barrier } from '@sync-js/core';

// Mutex for exclusive access
const mutex = new Mutex();
await mutex.lock(async () => {
  counter++;
});

// Semaphore for limiting concurrent access
const semaphore = new Semaphore(3);
await semaphore.acquire(async () => {
  await processResource();
});

// Barrier for synchronizing multiple operations
const barrier = new Barrier(3);
await Promise.all([
  (async () => {
    await doWork1();
    await barrier.wait();
  })(),
  (async () => {
    await doWork2();
    await barrier.wait();
  })(),
  (async () => {
    await doWork3();
    await barrier.wait();
  })(),
]);
```

### Cancellation Tokens

```typescript
import { CancellationTokenSource, createTimeoutToken } from '@sync-js/core';

// Manual cancellation
const source = new CancellationTokenSource();
setTimeout(() => source.cancel('user'), 5000);

await AsyncFlow.execute(async (token) => {
  for (let i = 0; i < 100; i++) {
    if (token.isCancellationRequested) {
      throw new Error(`Cancelled: ${token.reason}`);
    }
    await work();
  }
}, { timeout: 5000 });

// Timeout token
const token = createTimeoutToken(3000);

// Aggregate token (cancel if any source cancels)
const aggregate = createAggregateToken(token1, token2, token3);
```

## API Reference

### EventBus

- `on<K>(event: K, listener: Listener<T[K]>): () => void` - Subscribe to event
- `onAsync<K>(event: K, listener: AsyncListener<T[K]>): () => void` - Subscribe with async support
- `once<K>(event: K, listener: Listener<T[K]>): () => void` - Subscribe once
- `emit<K>(event: K, data: T[K]): void` - Emit event synchronously
- `emitAsync<K>(event: K, data: T[K]): Promise<void>` - Emit event asynchronously
- `removeAllListeners(event?: K): void` - Remove listeners
- `listenerCount(event: K): number` - Get listener count

### AsyncFlow

- `execute<T>(operation: Function, options?: FlowOptions): Promise<T>` - Execute with retry/timeout
- `race<T>(operations: Function[], timeout?: number): Promise<T>` - Race operations
- `sequence<T>(operations: Function[], options?: FlowOptions): Promise<T[]>` - Sequential execution
- `parallel<T>(operations: Function[], concurrency?: number, options?: FlowOptions): Promise<T[]>` - Parallel execution

### MiddlewareChain

- `use(middleware: Middleware): this` - Add middleware
- `useAll(...middlewares: Middleware[]): this` - Add multiple
- `execute(context: TContext): Promise<void>` - Execute chain

### WorkflowOrchestrator

- `addStep(step: WorkflowStep): this` - Add a step
- `addSteps(...steps: WorkflowStep[]): this` - Add multiple steps
- `execute(context?: WorkflowContext): Promise<WorkflowContext>` - Execute workflow
- `on(event: string, listener: Function): () => void` - Subscribe to events
- `stepCount: number` - Number of steps

### Synchronization

- **Mutex** - Exclusive lock access
- **Semaphore** - Limited concurrent access
- **Barrier** - Synchronize multiple operations
- **ConditionVariable** - Coordinate synchronization
- **ConflictResolver** - Resolve data conflicts

### Cancellation

- **CancellationTokenSource** - Create and manage tokens
- `createTimeoutToken(ms: number): CancellationToken` - Auto-cancel after timeout
- `createAggregateToken(...tokens: CancellationToken[]): CancellationToken` - Combine tokens

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## License

MIT

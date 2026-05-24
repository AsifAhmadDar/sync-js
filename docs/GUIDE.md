# sync-js Documentation

Comprehensive guide to using sync-js for managing application flow and orchestration.

## Table of Contents

1. [Event Coordination](#event-coordination)
2. [Async Flows](#async-flows)
3. [Middleware Chains](#middleware-chains)
4. [Lifecycle Hooks](#lifecycle-hooks)
5. [Workflow Orchestration](#workflow-orchestration)
6. [Synchronization](#synchronization)
7. [Cancellation](#cancellation)

## Event Coordination

The `EventBus` provides a strongly-typed event emitter with support for both synchronous and asynchronous listeners.

### Basic Usage

```typescript
import { EventBus } from '@sync-js/core';

interface MyEvents {
  userCreated: { id: string; name: string };
  userDeleted: { id: string };
  error: Error;
}

const eventBus = new EventBus<MyEvents>();

// Subscribe with sync listener
const unsubscribe = eventBus.on('userCreated', (event) => {
  console.log(`User created: ${event.name}`);
});

// Unsubscribe
unsubscribe();
```

### Async Listeners

For operations that require async handling:

```typescript
eventBus.onAsync('userCreated', async (event) => {
  await sendWelcomeEmail(event.id);
  await addToNewsletterQueue(event.id);
});

// Emit and wait for all async listeners
await eventBus.emitAsync('userCreated', { id: '1', name: 'John' });
```

### One-Time Listeners

Listen for an event only once:

```typescript
eventBus.once('userCreated', (event) => {
  console.log('First user created!');
});
```

### Event Management

```typescript
// Check listener count
const count = eventBus.listenerCount('userCreated');

// Remove all listeners for an event
eventBus.removeAllListeners('userCreated');

// Remove all listeners
eventBus.removeAllListeners();
```

## Async Flows

The `AsyncFlow` class provides utilities for executing asynchronous operations with retry, timeout, and cancellation support.

### Execute with Retry

```typescript
import { AsyncFlow } from '@sync-js/core';

const result = await AsyncFlow.execute(
  async (token) => {
    // Your async operation
    return await fetchDataFromAPI();
  },
  {
    maxRetries: 3,
    timeout: 5000,
    onError: async (error) => {
      console.log('Attempt failed:', error.message);
    },
  }
);
```

### Sequential Execution

Execute multiple operations sequentially:

```typescript
const results = await AsyncFlow.sequence(
  [
    (token) => fetchUser(1, token),
    (token) => fetchUser(2, token),
    (token) => fetchUser(3, token),
  ],
  { timeout: 10000 }
);
```

### Parallel Execution with Concurrency

Execute multiple operations in parallel with a concurrency limit:

```typescript
const results = await AsyncFlow.parallel(
  operations,
  3, // max 3 concurrent
  { timeout: 30000, maxRetries: 2 }
);
```

### Race Operations

Get the result of the first completed operation:

```typescript
const fastest = await AsyncFlow.race(
  [
    (token) => fetchFromServer1(token),
    (token) => fetchFromServer2(token),
    (token) => fetchFromServer3(token),
  ],
  5000 // timeout
);
```

### Deferred Promises

Create manually resolvable promises:

```typescript
import { createDeferred } from '@sync-js/core';

const { promise, resolve, reject } = createDeferred<string>();

setTimeout(() => {
  resolve('Success!');
}, 1000);

const result = await promise; // "Success!"
```

## Middleware Chains

The `MiddlewareChain` allows you to build composable request/response pipelines.

### Basic Middleware

```typescript
import { MiddlewareChain } from '@sync-js/core';

interface Context {
  request: Request;
  response: Response;
  data: Record<string, any>;
}

const chain = new MiddlewareChain<Context>();

chain.use(async (context, next) => {
  console.log('Before');
  await next();
  console.log('After');
});
```

### Middleware Composition

```typescript
chain
  .use(async (ctx, next) => {
    // Logging
    console.log(`→ ${ctx.request.method} ${ctx.request.path}`);
    await next();
    console.log(`← ${ctx.response.status}`);
  })
  .use(async (ctx, next) => {
    // Authentication
    if (!isAuthenticated(ctx)) {
      throw new Error('Unauthorized');
    }
    await next();
  })
  .use(async (ctx, next) => {
    // Rate limiting
    if (isRateLimited(ctx)) {
      throw new Error('Too many requests');
    }
    await next();
  });

await chain.execute(context);
```

### Error Handling

Middleware can throw errors to halt the chain:

```typescript
chain.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});
```

## Lifecycle Hooks

Manage application initialization, startup, and shutdown phases.

### ApplicationLifecycle

```typescript
import { ApplicationLifecycle } from '@sync-js/core';

const app = new ApplicationLifecycle();

app.onInit(async () => {
  console.log('Loading configuration...');
  await loadConfig();
});

app.onStart(async () => {
  console.log('Starting services...');
  await startServices();
});

app.onReady(async () => {
  console.log('Application is ready!');
});

app.onShutdown(async () => {
  console.log('Graceful shutdown...');
  await closeConnections();
});

app.onDestroy(async () => {
  console.log('Cleanup complete');
});
```

### Executing Lifecycle

```typescript
// Execute all init hooks
await app.init();

// Execute all start hooks
await app.start();

// Execute all ready hooks
await app.ready();

// Execute shutdown hooks (errors are caught)
await app.shutdown();

// Execute destroy hooks (errors are caught)
await app.destroy();
```

### Custom Lifecycle Events

```typescript
import { LifecycleManager } from '@sync-js/core';

const lifecycle = new LifecycleManager();

lifecycle.on('beforeMigration', async () => {
  console.log('Running migrations...');
});

lifecycle.on('afterMigration', async () => {
  console.log('Migrations complete');
});

await lifecycle.emit('beforeMigration');
await lifecycle.emit('afterMigration');
```

## Workflow Orchestration

Execute complex multi-step workflows with error handling and event tracking.

### Using WorkflowBuilder

```typescript
import { WorkflowBuilder } from '@sync-js/core';

const workflow = new WorkflowBuilder()
  .step('validate', async () => {
    console.log('Validating input...');
    validateData();
  })
  .step('transform', async () => {
    console.log('Transforming data...');
    transformData();
  })
  .step('save', async () => {
    console.log('Saving to database...');
    await saveToDatabase();
  })
  .build();

await workflow.execute();
```

### Advanced Steps

```typescript
const workflow = new WorkflowBuilder()
  .step('fetch', async () => {
    return await fetchData();
  }, {
    timeout: 5000,        // 5 second timeout
    retryable: true,      // Retry on failure
  })
  .step('process', async () => {
    return await processData();
  }, {
    canExecute: () => hasData(),  // Conditional execution
  })
  .build();
```

### Workflow Events

```typescript
workflow.on('stepStart', ({ step }) => {
  console.log(`Starting: ${step}`);
});

workflow.on('stepComplete', ({ step, duration }) => {
  console.log(`Completed: ${step} (${duration}ms)`);
});

workflow.on('stepError', ({ step, error }) => {
  console.error(`Failed: ${step}`, error);
});

workflow.on('workflowStart', ({ stepCount }) => {
  console.log(`Starting workflow with ${stepCount} steps`);
});

workflow.on('workflowComplete', ({ duration }) => {
  console.log(`Workflow completed in ${duration}ms`);
});

workflow.on('workflowError', ({ error }) => {
  console.error('Workflow failed:', error);
});
```

### Workflow Context

```typescript
const context = await workflow.execute();

// Store data between steps
context.set('userId', '123');
context.get('userId'); // '123'
```

## Synchronization

Coordinate concurrent access to shared resources.

### Mutex (Mutual Exclusion)

```typescript
import { Mutex } from '@sync-js/core';

const mutex = new Mutex();
let counter = 0;

// Only one coroutine can execute at a time
await mutex.lock(async () => {
  const temp = counter;
  await delay(10);
  counter = temp + 1;
});
```

### Semaphore

Limit concurrent access:

```typescript
import { Semaphore } from '@sync-js/core';

const semaphore = new Semaphore(3);

// Only 3 concurrent operations
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    semaphore.acquire(async () => {
      await processItem(i);
    })
  );
}
await Promise.all(promises);
```

### Barrier

Synchronize multiple operations:

```typescript
import { Barrier } from '@sync-js/core';

const barrier = new Barrier(3);

await Promise.all([
  (async () => {
    await doWork1();
    await barrier.wait(); // Wait for others
    console.log('All done!');
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

### ConditionVariable

Coordinate based on predicates:

```typescript
import { ConditionVariable } from '@sync-js/core';

const condition = new ConditionVariable();
let ready = false;

// Wait for condition
await condition.wait(
  () => ready,
  async () => {
    console.log('Condition met!');
  }
);

// In another context
ready = true;
condition.notifyAll();
```

### ConflictResolver

Handle data conflicts:

```typescript
import { ConflictResolver } from '@sync-js/core';

const resolver = new ConflictResolver(
  { value: 0 },
  {
    onConflict: (conflicts) => {
      console.log('Conflicts:', conflicts);
    },
  }
);

const lockId = resolver.acquireLock('resource1');
// ... do work ...
resolver.releaseLock('resource1', lockId);

await resolver.update((data) => {
  data.value++;
  return data;
});
```

## Cancellation

Gracefully cancel long-running operations.

### CancellationTokenSource

```typescript
import { CancellationTokenSource } from '@sync-js/core';

const source = new CancellationTokenSource();

// Cancel from elsewhere
setTimeout(() => source.cancel('user'), 5000);

await AsyncFlow.execute(async (token) => {
  for (let i = 0; i < 100; i++) {
    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled');
    }
    await work();
  }
});
```

### Timeout Tokens

```typescript
import { createTimeoutToken } from '@sync-js/core';

const token = createTimeoutToken(3000); // Auto-cancel after 3 seconds

await AsyncFlow.execute(async (token) => {
  // Will be cancelled after 3 seconds
  await longRunningOperation();
});
```

### Aggregate Tokens

```typescript
import { createAggregateToken } from '@sync-js/core';

const aggregate = createAggregateToken(
  createTimeoutToken(5000),
  token1,
  token2
);

// Cancels if any source cancels
```

### Checking Cancellation

```typescript
const token = createTimeoutToken(3000);

token.onCancellationRequested((reason) => {
  console.log(`Cancelled: ${reason}`); // 'timeout'
});

// Or manually check
if (token.isCancellationRequested) {
  console.log(`Reason: ${token.reason}`);
}
```

## Advanced Patterns

### Event-Driven Workflows

```typescript
const eventBus = new EventBus<AppEvents>();
const workflow = new WorkflowBuilder();

eventBus.on('trigger', () => {
  workflow.execute();
});
```

### Middleware with Lifecycle

```typescript
const lifecycle = new ApplicationLifecycle();
const chain = new MiddlewareChain();

lifecycle.onStart(async () => {
  chain.use(myMiddleware);
});

lifecycle.onShutdown(async () => {
  chain.clear();
});
```

### Retry with Cancellation

```typescript
await AsyncFlow.execute(
  async (token) => {
    token.throwIfCancellationRequested();
    return await operation();
  },
  { maxRetries: 3 }
);
```

## TypeScript Best Practices

Always provide type parameters for generic types:

```typescript
// Good
const eventBus = new EventBus<MyEvents>();
const chain = new MiddlewareChain<MyContext>();
const workflow = new WorkflowBuilder(); // Types are inferred from steps

// Avoid
const eventBus = new EventBus(); // Missing type parameter
```

## Performance Considerations

- Use `Semaphore` to limit concurrent operations and prevent resource exhaustion
- Set appropriate `timeout` values to prevent indefinite hangs
- Use `Barrier` for synchronization instead of polling
- Consider `Mutex` over `ConditionVariable` when mutual exclusion is needed

## Error Handling

```typescript
try {
  await workflow.execute();
} catch (error) {
  if (error instanceof CancellationError) {
    console.log('Operation was cancelled');
  } else if (error instanceof TimeoutError) {
    console.log('Operation timed out');
  } else {
    console.error('Unknown error:', error);
  }
}
```

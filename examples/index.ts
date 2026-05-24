/**
 * Examples of using sync-js
 */

import {
  EventBus,
  MiddlewareChain,
  ApplicationLifecycle,
  CancellationTokenSource,
  AsyncFlow,
  WorkflowBuilder,
  Mutex,
} from '../src/index.js';

// ============================================
// Example 1: Event Coordination
// ============================================

interface AppEvents {
  userLogin: { userId: string; timestamp: number };
  userLogout: { userId: string };
  error: { message: string; code: number };
}

async function eventCoordinationExample(): Promise<void> {
  const eventBus = new EventBus<AppEvents>();

  // Subscribe to events
  eventBus.on('userLogin', ({ userId, timestamp }) => {
    console.log(`User ${userId} logged in at ${new Date(timestamp).toISOString()}`);
  });

  eventBus.onAsync('userLogin', async ({ userId }) => {
    // Async operations like logging to database
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`Logged user ${userId} to database`);
  });

  eventBus.on('error', ({ message, code }) => {
    console.error(`Error ${code}: ${message}`);
  });

  // Emit events
  eventBus.emit('userLogin', { userId: 'user1', timestamp: Date.now() });
  await eventBus.emitAsync('userLogin', { userId: 'user2', timestamp: Date.now() });
}

// ============================================
// Example 2: Async Flows with Retry
// ============================================

async function asyncFlowExample(): Promise<void> {
  let attempt = 0;

  const result = await AsyncFlow.execute(
    async (token) => {
      attempt++;
      if (attempt < 2) {
        throw new Error('First attempt failed');
      }
      return 'Success!';
    },
    {
      maxRetries: 3,
      onError: async (error) => {
        console.log(`Attempt failed: ${error.message}`);
      },
    }
  );

  console.log(result); // "Success!"
}

// ============================================
// Example 3: Middleware Chains
// ============================================

interface Request {
  path: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function middlewareExample(): Promise<void> {
  const chain = new MiddlewareChain<Request>();

  // Add logging middleware
  chain.use(async (req, next) => {
    console.log(`-> ${req.path}`);
    await next();
    console.log(`<- ${req.path}`);
  });

  // Add auth middleware
  chain.use(async (req, next) => {
    if (!req.headers['authorization']) {
      throw new Error('Unauthorized');
    }
    await next();
  });

  // Add body parsing middleware
  chain.use(async (req, next) => {
    console.log('Body:', req.body);
    await next();
  });

  const request = {
    path: '/api/users',
    headers: { authorization: 'Bearer token' },
    body: { name: 'John' },
  };

  try {
    await chain.execute(request);
  } catch (error) {
    console.error(error);
  }
}

// ============================================
// Example 4: Lifecycle Hooks
// ============================================

class Application {
  private lifecycle = new ApplicationLifecycle();

  constructor() {
    this.lifecycle.onInit(async () => {
      console.log('Initializing application...');
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    this.lifecycle.onStart(async () => {
      console.log('Starting application...');
    });

    this.lifecycle.onReady(async () => {
      console.log('Application ready!');
    });

    this.lifecycle.onShutdown(async () => {
      console.log('Shutting down...');
    });
  }

  async start(): Promise<void> {
    await this.lifecycle.init();
    await this.lifecycle.start();
    await this.lifecycle.ready();
  }

  async stop(): Promise<void> {
    await this.lifecycle.shutdown();
  }
}

// ============================================
// Example 5: Workflow Orchestration
// ============================================

async function workflowExample(): Promise<void> {
  const workflow = new WorkflowBuilder()
    .step('validate', async () => {
      console.log('Validating data...');
    })
    .step('transform', async () => {
      console.log('Transforming data...');
    })
    .step('save', async () => {
      console.log('Saving data...');
    })
    .build();

  // Subscribe to events
  workflow.on('stepStart', ({ step }) => {
    console.log(`Starting step: ${step}`);
  });

  workflow.on('stepComplete', ({ step, duration }) => {
    console.log(`Completed step: ${step} (${duration}ms)`);
  });

  // Execute workflow
  await workflow.execute();
}

// ============================================
// Example 6: Cancellation
// ============================================

async function cancellationExample(): Promise<void> {
  const source = new CancellationTokenSource();

  // Cancel after 500ms
  setTimeout(() => source.cancel('user'), 500);

  try {
    await AsyncFlow.execute(async (token) => {
      for (let i = 0; i < 10; i++) {
        if (token.isCancellationRequested) {
          throw new Error('Operation cancelled');
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        console.log(`Processing item ${i}`);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

// ============================================
// Example 7: Synchronization with Mutex
// ============================================

async function synchronizationExample(): Promise<void> {
  const mutex = new Mutex();
  let counter = 0;

  // Simulate concurrent access
  const promises = Array.from({ length: 5 }, async (_, i) => {
    await mutex.lock(async () => {
      counter++;
      console.log(`Task ${i}: counter = ${counter}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  await Promise.all(promises);
  console.log(`Final counter: ${counter}`);
}

// ============================================
// Run all examples
// ============================================

async function runAllExamples(): Promise<void> {
  console.log('=== Event Coordination ===');
  await eventCoordinationExample();

  console.log('\n=== Async Flows ===');
  await asyncFlowExample();

  console.log('\n=== Middleware Chains ===');
  await middlewareExample();

  console.log('\n=== Lifecycle Hooks ===');
  const app = new Application();
  await app.start();
  await app.stop();

  console.log('\n=== Workflow Orchestration ===');
  await workflowExample();

  console.log('\n=== Cancellation ===');
  await cancellationExample();

  console.log('\n=== Synchronization ===');
  await synchronizationExample();
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

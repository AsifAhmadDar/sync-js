# Quick Start Guide

Get up and running with sync-js in minutes.

## Installation

```bash
cd d:\Projects\libraries\sync-js
npm install
```

## Building the Library

```bash
# Build TypeScript to JavaScript
npm run build

# Output will be in the dist/ directory
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:coverage

# Check coverage report
npm test:coverage
```

## Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Development

```bash
# Watch TypeScript compilation
npm run dev
```

## Project Structure

```
sync-js/
├── src/                          # Source code
│   ├── cancellation/            # Cancellation token system
│   ├── events/                  # Event coordination
│   ├── flow/                    # Async flow management
│   ├── lifecycle/               # Lifecycle hooks
│   ├── middleware/              # Middleware chains
│   ├── orchestration/           # Workflow orchestration
│   ├── synchronization/         # Synchronization primitives
│   ├── types.ts                 # Type definitions
│   └── index.ts                 # Public API
├── tests/                        # Test files
├── examples/                     # Usage examples
├── docs/                         # Documentation
│   ├── GUIDE.md                 # Complete usage guide
│   └── ARCHITECTURE.md          # Architecture documentation
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json                # ESLint rules
├── .prettierrc.json              # Prettier formatting
├── vitest.config.ts              # Test configuration
├── CONTRIBUTING.md               # Contribution guidelines
└── README.md                     # Main documentation
```

## Using the Library

### 1. Basic Event Coordination

```typescript
import { EventBus } from './src/index.js';

interface Events {
  hello: string;
}

const bus = new EventBus<Events>();
bus.on('hello', (msg) => console.log(msg));
bus.emit('hello', 'world');
```

### 2. Async Operations with Retry

```typescript
import { AsyncFlow } from './src/index.js';

const result = await AsyncFlow.execute(
  async (token) => fetchData(),
  { maxRetries: 3, timeout: 5000 }
);
```

### 3. Middleware Chain

```typescript
import { MiddlewareChain } from './src/index.js';

const chain = new MiddlewareChain();
chain.use(async (ctx, next) => {
  console.log('Before');
  await next();
  console.log('After');
});

await chain.execute({});
```

### 4. Lifecycle Hooks

```typescript
import { ApplicationLifecycle } from './src/index.js';

const app = new ApplicationLifecycle();
app.onInit(async () => console.log('Init'));
app.onStart(async () => console.log('Start'));

await app.init();
await app.start();
```

### 5. Workflow Orchestration

```typescript
import { WorkflowBuilder } from './src/index.js';

const workflow = new WorkflowBuilder()
  .step('step1', async () => console.log('Step 1'))
  .step('step2', async () => console.log('Step 2'))
  .build();

await workflow.execute();
```

## Viewing Examples

Check out the comprehensive examples in `examples/index.ts`:

```bash
# View examples code
cat examples/index.ts
```

## Reading Documentation

- **Getting Started**: [README.md](README.md)
- **Complete Guide**: [docs/GUIDE.md](docs/GUIDE.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Build the project: `npm run build`
3. ✅ Run tests: `npm test`
4. 📖 Read the main [README.md](README.md)
5. 📚 Explore [docs/GUIDE.md](docs/GUIDE.md) for detailed usage
6. 💡 Check [examples/index.ts](examples/index.ts) for code examples
7. 🏗️ Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for internals

## Common Tasks

### Adding a New Feature

1. Create new files in `src/`
2. Export from `src/index.ts`
3. Add tests in `tests/`
4. Update `README.md` with examples
5. Run `npm run build` to verify

### Running a Specific Test

```bash
npm test -- tests/events.test.ts
```

### Watching for Changes

```bash
npm run dev  # Watches TypeScript compilation
npm test -- --watch  # Watches tests
```

## Troubleshooting

### TypeScript Errors

```bash
# Check for type errors
npx tsc --noEmit
```

### Linting Errors

```bash
npm run lint:fix
```

### Build Issues

```bash
npm run clean
npm install
npm run build
```

## Publishing

When ready to publish to npm:

```bash
npm run build
npm test
npm publish
```

Ensure you've updated the version in `package.json` before publishing.

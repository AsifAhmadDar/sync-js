# Contributing to sync-js

Thank you for your interest in contributing to sync-js! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/sync-js.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/my-feature`

## Development Workflow

```bash
# Watch mode during development
npm run dev

# Run tests
npm test

# Check test coverage
npm test:coverage

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format

# Build the library
npm run build
```

## Code Standards

- **TypeScript**: All code must be written in TypeScript with strict mode enabled
- **Typing**: No `any` types allowed - be explicit about types
- **Comments**: Add JSDoc comments to public APIs
- **Tests**: New features must include comprehensive test coverage
- **Formatting**: Code must be formatted with Prettier
- **Linting**: Code must pass ESLint checks

## Submitting Changes

1. Make sure your code passes all tests: `npm test`
2. Ensure code is formatted: `npm run format`
3. Ensure linting passes: `npm run lint`
4. Update the README if adding new features
5. Create a pull request with a clear description of your changes

## Testing Guidelines

- Write unit tests for all new functionality
- Use descriptive test names
- Test both success and failure cases
- Include edge cases
- Keep tests focused and independent

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add new middleware feature`
- `fix: resolve cancellation token race condition`
- `docs: update lifecycle hooks documentation`
- `test: add tests for semaphore`

## Code Review

All pull requests will be reviewed by maintainers. We look for:
- Correct implementation of features
- Comprehensive test coverage
- Clear code and documentation
- Adherence to project standards
- Performance considerations

## Need Help?

- Check existing issues and discussions
- Create an issue to discuss larger features
- Review examples in the `/examples` directory

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

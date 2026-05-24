import { describe, it, expect } from 'vitest';
import { CancellationTokenSource, createTimeoutToken, createAggregateToken } from '../cancellation/index.js';

describe('Cancellation', () => {
  it('should create and cancel tokens', () => {
    const source = new CancellationTokenSource();
    expect(source.token.isCancellationRequested).toBe(false);

    source.cancel('user');
    expect(source.token.isCancellationRequested).toBe(true);
    expect(source.token.reason).toBe('user');
  });

  it('should notify on cancellation', () => {
    const source = new CancellationTokenSource();
    const results: string[] = [];

    source.token.onCancellationRequested((reason: any) => {
      results.push(reason);
    });

    source.cancel('test');

    expect(results).toEqual(['test']);
  });

  it('should create timeout tokens', async () => {
    const token = createTimeoutToken(50);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(token.isCancellationRequested).toBe(true);
    expect(token.reason).toBe('timeout');
  });

  it('should aggregate tokens', () => {
    const source1 = new CancellationTokenSource();
    const source2 = new CancellationTokenSource();
    const aggregate = createAggregateToken(source1.token, source2.token);

    expect(aggregate.isCancellationRequested).toBe(false);

    source1.cancel('test');
    expect(aggregate.isCancellationRequested).toBe(true);
  });

  it('should throw when checking cancellation', () => {
    const source = new CancellationTokenSource();
    source.cancel('test');

    expect(() => {
      (source.token as any).throwIfCancellationRequested();
    }).toThrow('CancellationError');
  });
});

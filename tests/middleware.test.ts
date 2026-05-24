import { describe, it, expect } from 'vitest';
import { createMiddlewareChain } from '../src/middleware';

describe('Middleware', () => {
  it('should execute middleware chain in order', async () => {
    const chain = createMiddlewareChain<{ order: string[] }>();
    const context = { order: [] };

    chain
      .use(async (ctx, next) => {
        ctx.order.push('1');
        await next();
        ctx.order.push('1-end');
      })
      .use(async (ctx, next) => {
        ctx.order.push('2');
        await next();
        ctx.order.push('2-end');
      })
      .use(async (ctx, next) => {
        ctx.order.push('3');
        await next();
        ctx.order.push('3-end');
      });

    await chain.execute(context);

    expect(context.order).toEqual(['1', '2', '3', '3-end', '2-end', '1-end']);
  });

  it('should add multiple middlewares', async () => {
    const chain = createMiddlewareChain<{ count: number }>();
    const context = { count: 0 };

    chain.useAll(
      async (ctx, next) => {
        ctx.count++;
        await next();
      },
      async (ctx, next) => {
        ctx.count++;
        await next();
      }
    );

    await chain.execute(context);

    expect(context.count).toBe(2);
  });

  it('should support early termination', async () => {
    const chain = createMiddlewareChain<{ order: string[] }>();
    const context = { order: [] };

    chain
      .use(async (ctx, next) => {
        ctx.order.push('1');
        await next();
        ctx.order.push('1-end');
      })
      .use(async (ctx) => {
        ctx.order.push('2');
        await Promise.resolve();
        // Don't call next
      })
      .use(async (ctx, next) => {
        ctx.order.push('3');
        await next();
      });

    await chain.execute(context);

    expect(context.order).toEqual(['1', '2', '1-end']);
  });

  it('should track middleware count', () => {
    const chain = createMiddlewareChain();

    expect(chain.count).toBe(0);

    chain.use(async () => {});
    expect(chain.count).toBe(1);

    chain.use(async () => {});
    expect(chain.count).toBe(2);
  });

  it('should clear middlewares', async () => {
    const chain = createMiddlewareChain<{ count: number }>();
    const context = { count: 0 };

    chain.use(async (ctx, next) => {
      ctx.count++;
      await next();
    });

    chain.clear();

    await chain.execute(context);

    expect(context.count).toBe(0);
  });
});

import type { Middleware } from '../types.js';

/**
 * A middleware chain executor
 */
export class MiddlewareChain<TContext extends Record<string, any> = Record<string, any>> {
  private middlewares: Middleware<TContext>[] = [];

  /**
   * Add a middleware to the chain
   */
  use(middleware: Middleware<TContext>): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Add multiple middlewares to the chain
   */
  useAll(...middlewares: Middleware<TContext>[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  /**
   * Execute the middleware chain with a given context
   */
  async execute(context: TContext): Promise<void> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) return;
      index = i;

      const middleware = this.middlewares[i];
      if (!middleware) return;

      try {
        await middleware(context, () => dispatch(i + 1));
      } catch (error) {
        throw error;
      }
    };

    await dispatch(0);
  }

  /**
   * Get the number of middlewares in the chain
   */
  get count(): number {
    return this.middlewares.length;
  }

  /**
   * Clear all middlewares
   */
  clear(): void {
    this.middlewares = [];
  }
}

/**
 * Create a new middleware chain
 */
export function createMiddlewareChain<TContext extends Record<string, any>>(): MiddlewareChain<TContext> {
  return new MiddlewareChain<TContext>();
}

/**
 * Compose multiple middlewares into a single middleware
 */
export function composeMiddlewares<TContext extends Record<string, any>>(
  ...middlewares: Middleware<TContext>[]
): Middleware<TContext> {
  return async (context, next) => {
    const chain = createMiddlewareChain<TContext>();
    chain.useAll(...middlewares);
    const middleware = middlewares[0];

    if (middleware !== undefined) {
      let index = 0;
      const dispatch = async (): Promise<void> => {
        const fn = middlewares[index++];
        if (!fn) {
          await next();
          return;
        }
        await fn(context, dispatch);
      };
      await dispatch();
    } else {
      await next();
    }
  };
}

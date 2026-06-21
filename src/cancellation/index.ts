import type { CancellationToken, CancellationReason } from '../types.js';

/**
 * A token that can be used to signal cancellation
 */
export class CancellationTokenImpl implements CancellationToken {
  private _isCancellationRequested = false;
  private _reason?: CancellationReason;
  private _listeners: Set<(reason: CancellationReason) => void> = new Set();

  get isCancellationRequested(): boolean {
    return this._isCancellationRequested;
  }

  get reason(): CancellationReason | undefined {
    return this._reason;
  }

  cancel(reason: CancellationReason = 'other'): void {
    if (this._isCancellationRequested) {
      return;
    }
    this._isCancellationRequested = true;
    this._reason = reason;
    this._listeners.forEach((listener) => listener(reason));
    this._listeners.clear();
  }

  onCancellationRequested(callback: (reason: CancellationReason) => void): void {
    if (this._isCancellationRequested && this._reason) {
      callback(this._reason);
    } else {
      this._listeners.add(callback);
    }
  }

  throwIfCancellationRequested(): void {
    if (this._isCancellationRequested) {
      const error = new Error(`Operation cancelled: ${this._reason || 'unknown'}`);
      error.name = 'CancellationError';
      throw error;
    }
  }
}

/**
 * A cancellation source that can create tokens and signal cancellation
 */
export class CancellationTokenSource {
  private _token: CancellationTokenImpl;

  constructor() {
    this._token = new CancellationTokenImpl();
  }

  get token(): CancellationToken {
    return this._token;
  }

  cancel(reason: CancellationReason = 'other'): void {
    this._token.cancel(reason);
  }
}

/**
 * Creates a cancellation token that automatically cancels after a timeout
 */
export function createTimeoutToken(ms: number): CancellationToken {
  const source = new CancellationTokenSource();
  setTimeout(() => source.cancel('timeout'), ms);
  return source.token;
}

/**
 * Creates a cancellation token that cancels when any of the provided tokens are cancelled
 */
export function createAggregateToken(...tokens: CancellationToken[]): CancellationToken {
  const source = new CancellationTokenSource();

  tokens.forEach((token) => {
    token.onCancellationRequested((reason) => {
      source.cancel(reason);
    });
  });

  return source.token;
}

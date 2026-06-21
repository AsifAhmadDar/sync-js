import type { WorkflowStep, WorkflowContext, Listener } from '../types.js';
import { CancellationTokenSource } from '../cancellation/index.js';
import { EventBus } from '../events/index.js';

/**
 * Workflow context implementation
 */
class WorkflowContextImpl implements WorkflowContext {
  private _data: Record<string, unknown> = Object.create(null);
  readonly cancellationToken = new CancellationTokenSource().token;

  get data(): Record<string, unknown> {
    return this._data;
  }

  set(key: string, value: unknown): void {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error(`Invalid key: ${key}`);
    }
    this._data[key] = value;
  }

  get(key: string): unknown {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return this._data[key];
  }
}

/**
 * Events emitted by the workflow orchestrator
 */
export interface WorkflowEvents extends Record<string, unknown> {
  stepStart: { step: string };
  stepComplete: { step: string; duration: number };
  stepError: { step: string; error: Error };
  workflowStart: { stepCount: number };
  workflowComplete: { duration: number };
  workflowError: { error: Error };
}

/**
 * Orchestrates a workflow of steps
 */
export class WorkflowOrchestrator {
  private steps: WorkflowStep[] = [];
  private eventBus = new EventBus<WorkflowEvents>();

  /**
   * Add a step to the workflow
   */
  addStep(step: WorkflowStep): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Add multiple steps to the workflow
   */
  addSteps(...steps: WorkflowStep[]): this {
    this.steps.push(...steps);
    return this;
  }

  /**
   * Clear all steps
   */
  clear(): this {
    this.steps = [];
    return this;
  }

  /**
   * Execute the workflow
   */
  async execute(context?: WorkflowContext): Promise<WorkflowContext> {
    const ctx = context || new WorkflowContextImpl();
    const startTime = Date.now();

    try {
      this.eventBus.emit('workflowStart', { stepCount: this.steps.length });

      for (const step of this.steps) {
        // Check cancellation
        if (ctx.cancellationToken.isCancellationRequested) {
          throw new Error(`Workflow cancelled: ${ctx.cancellationToken.reason || 'unknown'}`);
        }

        // Check if step can execute
        if (step.canExecute && !step.canExecute()) {
          continue;
        }

        // Execute step with retry logic
        const maxRetries = step.retryable ? 3 : 1;
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            this.eventBus.emit('stepStart', { step: step.name });
            const stepStartTime = Date.now();

            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            const timeoutPromise = step.timeout
              ? new Promise<void>((_, reject) => {
                  timeoutId = setTimeout(
                    () => reject(new Error(`Step timeout: ${step.name}`)),
                    step.timeout
                  );
                })
              : null;

            const executePromise = Promise.resolve(step.execute());

            try {
              if (timeoutPromise) {
                await Promise.race([executePromise, timeoutPromise]);
              } else {
                await executePromise;
              }
            } finally {
              if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
              }
            }

            const duration = Date.now() - stepStartTime;
            this.eventBus.emit('stepComplete', { step: step.name, duration });
            break; // Step succeeded
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries - 1) {
              throw lastError;
            }

            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          }
        }
      }

      const duration = Date.now() - startTime;
      this.eventBus.emit('workflowComplete', { duration });

      return ctx;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.eventBus.emit('workflowError', { error: err });
      throw err;
    }
  }

  /**
   * Subscribe to workflow events
   */
  on<K extends keyof WorkflowEvents>(event: K, listener: (data: WorkflowEvents[K]) => void): () => void {
    return this.eventBus.on(event, listener as Listener<WorkflowEvents[K]>);
  }

  /**
   * Get step count
   */
  get stepCount(): number {
    return this.steps.length;
  }
}

/**
 * A builder for constructing workflows
 */
export class WorkflowBuilder {
  private steps: WorkflowStep[] = [];

  /**
   * Add a step to the workflow
   */
  step(name: string, execute: () => Promise<void>, options?: Partial<WorkflowStep>): this {
    this.steps.push({
      name,
      execute,
      ...options,
    });
    return this;
  }

  /**
   * Build the workflow
   */
  build(): WorkflowOrchestrator {
    const orchestrator = new WorkflowOrchestrator();
    orchestrator.addSteps(...this.steps);
    return orchestrator;
  }

  /**
   * Clear steps
   */
  clear(): this {
    this.steps = [];
    return this;
  }
}

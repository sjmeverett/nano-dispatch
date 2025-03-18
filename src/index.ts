import type { Matcher } from "./matchers/index.js";
import equalMatcher from "./matchers/equalMatcher.js";

export type { Matcher };

export type HandlerResult<T> =
  | T
  | null
  | undefined
  | Promise<T | null | undefined>;

export type Handler<TInput extends unknown[], TOutput> = (
  ...input: TInput
) => HandlerResult<TOutput>;

export type ErrorHandler<TResponse, TInput extends unknown[]> = (
  error: unknown,
  ...input: TInput
) => TResponse;

export interface Binding<TPattern, TInput extends unknown[], TOutput> {
  pattern: TPattern;
  handlers: Handler<TInput, TOutput>[];
}

class Dispatcher<
  TPattern extends unknown[] = string[],
  TTarget extends unknown[] = TPattern,
  TInput extends unknown[] = unknown[],
  TOutput = unknown,
> {
  public readonly bindings: Binding<TPattern | null, TInput, TOutput>[] = [];
  public readonly errorHandlers: ErrorHandler<TOutput, TInput>[] = [];

  constructor(
    private readonly match: Matcher<TPattern, TTarget, TInput> = equalMatcher,
  ) {}

  on(...pattern: TPattern) {
    return {
      do: (...handlers: Handler<TInput, TOutput>[]) => {
        this.bindings.push({ pattern, handlers });
      },
    };
  }

  do(...handlers: Handler<TInput, TOutput>[]) {
    this.bindings.push({ pattern: null, handlers });
  }

  catch(errorHandler: ErrorHandler<TOutput, TInput>) {
    this.errorHandlers.push(errorHandler);
  }

  find(...target: TTarget) {
    return async (...input: TInput): Promise<TOutput | null | undefined> => {
      try {
        for (const binding of this.bindings) {
          if (
            !binding.pattern ||
            this.match(binding.pattern, target, ...input)
          ) {
            for (const handler of binding.handlers) {
              const result = await handler(...input);
              if (result != null) return result;
            }
          }
        }

        return null;
      } catch (e) {
        if (!this.errorHandlers.length) throw e;

        for (const handler of this.errorHandlers) {
          const result = await handler(e, ...input);
          if (result != null) return result;
        }

        return null;
      }
    };
  }
}

export default Dispatcher;

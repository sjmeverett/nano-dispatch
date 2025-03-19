import type { Matcher } from "./matchers/index.js";
import equalMatcher from "./matchers/equalMatcher.js";

export type { Matcher };

export type HandlerResult<T> = T | undefined | Promise<T | undefined>;

export type Handler<Input extends unknown[], Output> = (
  ...input: Input
) => HandlerResult<Output>;

export type ErrorHandler<Response, Input extends unknown[]> = (
  error: unknown,
  ...input: Input
) => Response | undefined | Promise<Response | undefined>;

export interface Binding<Pattern, Input extends unknown[], Output> {
  pattern: Pattern;
  handlers: Handler<Input, Output>[];
}

class Dispatcher<
  Pattern extends unknown[] = string[],
  Target extends unknown[] = Pattern,
  Input extends unknown[] = unknown[],
  Output = unknown,
> {
  public readonly bindings: Binding<Pattern | null, Input, Output>[] = [];
  public readonly errorHandlers: ErrorHandler<Output, Input>[] = [];

  constructor(
    private readonly match: Matcher<Pattern, Target, Input> = equalMatcher,
  ) {}

  on(...pattern: Pattern) {
    return {
      do: (...handlers: Handler<Input, Output>[]) => {
        this.bindings.push({ pattern, handlers });
      },
    };
  }

  do(...handlers: Handler<Input, Output>[]) {
    this.bindings.push({ pattern: null, handlers });
  }

  catch(errorHandler: ErrorHandler<Output, Input>) {
    this.errorHandlers.push(errorHandler);
  }

  find(...target: Target) {
    return async (...input: Input): Promise<Output | null | undefined> => {
      try {
        for (const binding of this.bindings) {
          if (
            !binding.pattern ||
            this.match(binding.pattern, target, ...input)
          ) {
            for (const handler of binding.handlers) {
              const result = await handler(...input);
              if (typeof result !== "undefined") return result;
            }
          }
        }

        return undefined;
      } catch (e) {
        if (!this.errorHandlers.length) throw e;

        for (const handler of this.errorHandlers) {
          const result = await handler(e, ...input);
          if (typeof result !== "undefined") return result;
        }

        return undefined;
      }
    };
  }
}

export default Dispatcher;

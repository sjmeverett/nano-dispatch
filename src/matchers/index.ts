export interface Matcher<TPattern, TTarget, TInput extends unknown[]> {
  (pattern: TPattern, target: TTarget, ...input: TInput): boolean;
}

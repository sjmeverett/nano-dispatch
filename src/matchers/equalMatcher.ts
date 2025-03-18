import type { Matcher } from "./index.js";

const equalMatcher: Matcher<unknown[], unknown[], unknown[]> = (
  pattern,
  target,
) => {
  if (pattern.length !== target.length) {
    throw new Error("pattern and target have different numbers of segments");
  }

  for (let i = 0; i < target.length; i++) {
    if (pattern[i] != null && pattern[i] !== target[i]) {
      return false;
    }
  }

  return true;
};

export default equalMatcher;

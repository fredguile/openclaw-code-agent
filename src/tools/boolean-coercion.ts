/**
 * Coerce a boolean-typed tool parameter to a real `boolean` or `undefined`.
 *
 * The OpenClaw core redactor and several LLM tool-call wrappers round-trip
 * booleans as the strings `"true"` / `"false"` instead of the JSON literals
 * `true` / `false`. The OCA tool schemas must still describe the parameter as
 * a real boolean (so the LLM learns the right shape), but the input layer
 * has to accept the string form too. Anything else is rejected as
 * `undefined` (the validation layer decides whether that is invalid input).
 */
export function coerceBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/** Predicate used by `isXxxParams` guards to accept the same shape. */
export function isBooleanLike(value: unknown): boolean {
  return value === undefined
    || typeof value === "boolean"
    || value === "true"
    || value === "false";
}

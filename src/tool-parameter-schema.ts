import { Array, Boolean, Enum, Literal, Number, Object, Optional, String, Union } from "typebox/type";

export type { TLiteral } from "typebox/type";

/**
 * TypeBox builders used for tool parameter schemas.
 *
 * The `typebox` root `Type` object drags the whole TypeBox type system
 * (including the template-literal script parser, ~77 KB minified) into the
 * bundle. Collecting only the builders the tools use keeps TypeBox at ~10 KB.
 * The schemas are plain TypeBox output, the same JSON Schema the OpenClaw
 * plugin SDK types tool parameters with.
 */
/**
 * A string enum as `{ type: "string", enum: [...] }`, the compact form OpenClaw's
 * own tools use; a `Union` of literals renders one `anyOf` entry per value.
 */
function StringEnum<const T extends readonly [string, ...string[]]>(values: T, options: { description?: string } = {}) {
  return Enum([...values] as unknown as T, { type: "string", ...options });
}

/**
 * A boolean parameter that also accepts the strings `"true"` / `"false"`.
 *
 * Several LLM tool-call wrappers (and some text protocols around them) emit
 * booleans as `"true"` / `"false"` rather than `true` / `false`. The plain
 * `Type.Boolean()` schema then rejects the call with `must be boolean`. The
 * OCA runtime coerces the accepted values to a real `boolean` via
 * `coerceBoolean` in the tool's `isXxxParams` guard and the execute handler;
 * every other value still fails validation.
 */
function BooleanLike(options: { description?: string } = {}) {
  return Union([Boolean(), Literal("true"), Literal("false")], options);
}

export const Type = { Array, Boolean, BooleanLike, Literal, Number, Object, Optional, String, StringEnum, Union };

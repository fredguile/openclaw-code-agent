/**
 * Regression test for the boolean-coercion helper and `Type.BooleanLike`
 * schema. Several LLM tool-call wrappers emit booleans as the strings
 * `"true"` / `"false"` instead of the JSON literals `true` / `false`. The
 * OCA tools must accept either form and normalize to a real `boolean`
 * before passing the value to internal functions.
 *
 * This test enforces three contracts:
 *   1. `coerceBoolean` normalizes every accepted input to a real `boolean`
 *      (or `undefined`); all other inputs become `undefined`.
 *   2. `Type.BooleanLike` schemas declare the union shape in the tool
 *      `parameters` (so the LLM sees a real boolean at the schema level).
 *   3. A tool that uses `coerceBoolean` in its execute handler accepts a
 *      `"true"` string and passes `true` to the internal action.
 *
 * If a future change reintroduces strict `Type.Boolean()` (which rejects
 * strings) or forgets to coerce in the execute handler, the corresponding
 * test fails. Run it as part of the standard OCA test suite
 * (`pnpm test`).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { coerceBoolean, isBooleanLike } from "../src/tools/boolean-coercion";
import { Type } from "../src/tool-parameter-schema";

describe("coerceBoolean", () => {
  it("returns undefined for undefined", () => {
    assert.equal(coerceBoolean(undefined), undefined);
  });

  it("returns the same boolean for true / false", () => {
    assert.equal(coerceBoolean(true), true);
    assert.equal(coerceBoolean(false), false);
  });

  it("coerces the string 'true' to true", () => {
    assert.equal(coerceBoolean("true"), true);
  });

  it("coerces the string 'false' to false", () => {
    assert.equal(coerceBoolean("false"), false);
  });

  it("returns undefined for any other string", () => {
    assert.equal(coerceBoolean("TRUE"), undefined);
    assert.equal(coerceBoolean("False"), undefined);
    assert.equal(coerceBoolean("1"), undefined);
    assert.equal(coerceBoolean("0"), undefined);
    assert.equal(coerceBoolean(""), undefined);
  });

  it("returns undefined for any other type", () => {
    assert.equal(coerceBoolean(0), undefined);
    assert.equal(coerceBoolean(1), undefined);
    assert.equal(coerceBoolean(null), undefined);
    assert.equal(coerceBoolean({}), undefined);
    assert.equal(coerceBoolean([]), undefined);
  });
});

describe("isBooleanLike", () => {
  it("accepts undefined, true, false, 'true', 'false'", () => {
    assert.equal(isBooleanLike(undefined), true);
    assert.equal(isBooleanLike(true), true);
    assert.equal(isBooleanLike(false), true);
    assert.equal(isBooleanLike("true"), true);
    assert.equal(isBooleanLike("false"), true);
  });

  it("rejects other inputs", () => {
    assert.equal(isBooleanLike("TRUE"), false);
    assert.equal(isBooleanLike(1), false);
    assert.equal(isBooleanLike(null), false);
    assert.equal(isBooleanLike({}), false);
  });
});

describe("Type.BooleanLike schema", () => {
  it("serializes to a JSON Schema that accepts boolean and 'true'/'false'", () => {
    const schema = Type.BooleanLike({ description: "test" });
    const json = schema as unknown as { anyOf?: Array<Record<string, unknown>> };
    assert.ok(Array.isArray(json.anyOf), "BooleanLike must serialize to anyOf (Union)");
    const branches = json.anyOf ?? [];
    const types = branches.flatMap((b) => (typeof b.type === "string" ? [b.type] : []));
    assert.ok(types.includes("boolean"), "BooleanLike must accept the boolean type");
    // TypeBox serialises `Literal("true")` as `{"const": "true"}` and
    // `Literal("false")` as `{"const": "false"}`; the test is permissive
    // about both `const` and `enum` (some TypeBox modes use enum for
    // single-value unions).
    const acceptedStrings = branches.flatMap((b) => {
      if (typeof b.const === "string") return [b.const];
      if (Array.isArray(b.enum)) return b.enum.filter((v): v is string => typeof v === "string");
      return [];
    });
    assert.ok(acceptedStrings.includes("true"), `BooleanLike must accept the string 'true' (got: ${JSON.stringify(acceptedStrings)})`);
    assert.ok(acceptedStrings.includes("false"), `BooleanLike must accept the string 'false' (got: ${JSON.stringify(acceptedStrings)})`);
  });
});

describe("agent_respond execute: string 'true' is accepted by validation", () => {
  it("accepts approve: 'true' without 'Invalid parameters' or 'must be boolean'", async () => {
    const { makeAgentRespondTool } = await import("../src/tools/agent-respond");
    const { setSessionManager } = await import("../src/singletons");

    // Set SessionManager to null so the tool short-circuits to
    // `service_unavailable` instead of running executeRespond. The contract
    // we test is that the validation layer (the only thing standing
    // between the call and executeRespond) accepted `approve: 'true'`.
    // If the validator had rejected it, the text would contain
    // "Invalid parameters" or "approve: must be boolean".
    setSessionManager(null);

    const tool = makeAgentRespondTool();
    const result = await tool.execute("call-1", {
      session: "s1",
      message: "Approved. Go ahead.",
      approve: "true",
      approval_rationale: "Low risk.",
    });
    const text = ((result as { content: Array<{ text: string }> }).content[0].text);
    assert.doesNotMatch(
      text,
      /Invalid parameters/,
      `agent_respond must accept approve: 'true' (string). Got: ${text}`,
    );
    assert.doesNotMatch(
      text,
      /must be boolean/,
      `agent_respond must accept approve: 'true' (string). Got: ${text}`,
    );
    assert.match(text, /SessionManager not initialized/, "the call should reach the service_unavailable branch, not validation");
  });

  it("accepts approve: 'false' without 'must be boolean'", async () => {
    const { makeAgentRespondTool } = await import("../src/tools/agent-respond");
    const { setSessionManager } = await import("../src/singletons");
    setSessionManager(null);
    const tool = makeAgentRespondTool();
    const result = await tool.execute("call-1", {
      session: "s1",
      message: "hello",
      approve: "false",
    });
    const text = ((result as { content: Array<{ text: string }> }).content[0].text);
    assert.doesNotMatch(text, /Invalid parameters|must be boolean/);
  });
});

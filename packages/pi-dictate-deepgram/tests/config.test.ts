import assert from "node:assert/strict";
import { test } from "vitest";
import { readConfig } from "../src/config.ts";

test("readConfig requires a Deepgram API key", () => {
  assert.deepEqual(readConfig({}), { ok: false, message: "DEEPGRAM_API_KEY is not set" });
});

test("readConfig builds a fixed TLS endpoint with encoded options", () => {
  const result = readConfig({
    DEEPGRAM_API_KEY: "secret",
    PI_DICTATE_MODEL: "nova-3",
    PI_DICTATE_LANGUAGE: "en-US",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.endpoint.protocol, "wss:");
  assert.equal(result.value.endpoint.hostname, "api.deepgram.com");
  assert.equal(result.value.endpoint.searchParams.get("language"), "en-US");
  assert.equal(result.value.endpoint.href.includes("secret"), false);
});

test("readConfig rejects injected model parameters", () => {
  const result = readConfig({ DEEPGRAM_API_KEY: "secret", PI_DICTATE_MODEL: "nova-3&callback=https://bad" });
  assert.equal(result.ok, false);
});

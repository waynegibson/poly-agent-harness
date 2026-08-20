import assert from "node:assert/strict";
import test from "node:test";
import { extractFinalTranscript, joinTranscript, normalizeTranscript } from "../src/transcript.ts";

test("extractFinalTranscript accepts only final result messages", () => {
  const final = Buffer.from(
    JSON.stringify({
      type: "Results",
      is_final: true,
      channel: { alternatives: [{ transcript: "hello world" }] },
    }),
  );
  assert.equal(extractFinalTranscript(final), "hello world");
  assert.equal(
    extractFinalTranscript(
      JSON.stringify({ type: "Results", is_final: false, channel: { alternatives: [{ transcript: "partial" }] } }),
    ),
    null,
  );
  assert.equal(extractFinalTranscript("not json"), null);
});

test("normalizeTranscript removes terminal and bidirectional controls", () => {
  assert.equal(normalizeTranscript("hello\u001b[31m  \u202eworld\u0000"), "hello[31m world");
});

test("joinTranscript normalizes boundaries between final segments", () => {
  assert.equal(joinTranscript(["one ", " two", "three"]), "one two three");
});

import assert from "node:assert/strict";
import test from "node:test";
import { rmsFromPcm16 } from "../src/audio.ts";

test("rmsFromPcm16 handles silence and full-scale samples", () => {
  assert.equal(rmsFromPcm16(Buffer.alloc(8)), 0);
  const samples = Buffer.alloc(4);
  samples.writeInt16LE(32_767, 0);
  samples.writeInt16LE(-32_768, 2);
  assert.ok(rmsFromPcm16(samples) > 0.99);
});

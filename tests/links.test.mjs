import assert from "node:assert/strict";
import { mkdir, mkdtemp, readlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import { linkSkill, unlinkSkill } from "../src/links.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "poly-agent-harness-"));
  const source = path.join(root, "source", "code-review");
  const destination = path.join(root, "installed");
  await mkdir(source, { recursive: true });
  return { destination, root, source };
}

test("linkSkill installs a link and is idempotent", async () => {
  const { destination, source } = await fixture();
  const first = await linkSkill(source, destination);
  const second = await linkSkill(source, destination);

  assert.equal(first.action, "linked");
  assert.equal(second.action, "unchanged");
  assert.equal(await readlink(first.target), source);
});

test("linkSkill refuses to overwrite a real directory", async () => {
  const { destination, source } = await fixture();
  await mkdir(path.join(destination, "code-review"), { recursive: true });

  const result = await linkSkill(source, destination);
  assert.equal(result.action, "conflict");
  assert.match(result.reason, /real file or directory/);
});

test("unlinkSkill removes only a matching symlink", async () => {
  const { destination, root, source } = await fixture();
  await linkSkill(source, destination);
  const removed = await unlinkSkill(source, destination);
  assert.equal(removed.action, "unlinked");

  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, "code-review"), "owned by someone else");
  const conflict = await unlinkSkill(source, destination);
  assert.equal(conflict.action, "conflict");
  assert.equal(root.length > 0, true);
});

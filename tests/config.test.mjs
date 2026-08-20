import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "vitest";
import { installationTargets, loadConfig, selectHarnesses } from "../src/config.mjs";

const config = {
  harnesses: {
    codex: { user: "~/.agents/skills", project: ".agents/skills" },
    pi: { user: "~/.agents/skills", project: ".agents/skills" },
    claude: { user: "~/.claude/skills", project: ".claude/skills" },
  },
};

test("selectHarnesses validates and de-duplicates names", () => {
  assert.deepEqual(selectHarnesses(config, "pi,codex,pi"), ["pi", "codex"]);
  assert.throws(() => selectHarnesses(config, "unknown"), /Unknown harness/);
});

test("installationTargets coalesces harnesses sharing a destination", () => {
  const targets = installationTargets(config, ["codex", "pi", "claude"], {
    scope: "user",
    home: "/tmp/home",
    project: "/tmp/project",
  });

  assert.equal(targets.length, 2);
  assert.deepEqual(targets[0].harnesses, ["codex", "pi"]);
  assert.equal(targets[0].destination, "/tmp/home/.agents/skills");
});

async function withConfig(value, callback) {
  const root = await mkdtemp(path.join(tmpdir(), "polyharness-config-"));
  try {
    const contents = typeof value === "string" ? value : JSON.stringify(value);
    await writeFile(path.join(root, "polyharness.config.json"), contents);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("loadConfig validates a configuration containing its schema reference", async () => {
  await withConfig(
    {
      $schema: "./schemas/polyharness.schema.json",
      skillsDirectory: "skills",
      harnesses: { pi: { user: "~/.agents/skills", project: ".agents/skills" } },
    },
    async (root) => {
      const loaded = await loadConfig(root);
      assert.equal(loaded.$schema, "./schemas/polyharness.schema.json");
    },
  );
});

test("loadConfig rejects properties and target types excluded by the schema", async () => {
  await withConfig(
    {
      skillsDirectory: "skills",
      harnesses: { pi: { user: 42, project: ".agents/skills" } },
      unexpected: true,
    },
    async (root) => {
      await assert.rejects(loadConfig(root), /additional properties.*\/harnesses\/pi\/user must be string/);
    },
  );
});

test("loadConfig reports malformed JSON with its file path", async () => {
  await withConfig("{", async (root) => {
    await assert.rejects(loadConfig(root), /Invalid JSON in .*polyharness\.config\.json/);
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { installationTargets, selectHarnesses } from "../src/config.mjs";

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

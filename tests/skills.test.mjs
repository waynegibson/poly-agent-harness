import assert from "node:assert/strict";
import test from "node:test";
import { parseFrontmatter, validateSkill } from "../src/skills.mjs";

test("parseFrontmatter reads required scalar fields", () => {
  const metadata = parseFrontmatter(`---
name: code-review
description: Review changes when a user asks for a code review.
---
# Code review
`);

  assert.deepEqual(metadata, {
    name: "code-review",
    description: "Review changes when a user asks for a code review.",
  });
});

test("parseFrontmatter folds block descriptions", () => {
  const metadata = parseFrontmatter(`---
name: code-review
description: >
  Review changes for regressions.
  Use when reviewing a diff.
---
`);

  assert.equal(metadata.description, "Review changes for regressions. Use when reviewing a diff.");
});

test("validateSkill enforces the portable naming subset", () => {
  const errors = validateSkill({
    directoryName: "code-review",
    file: "/skills/code-review/SKILL.md",
    metadata: {
      name: "Code Review",
      description: "Review code.",
    },
  });

  assert.equal(errors.length, 2);
  assert.match(errors[0], /lowercase letters/);
  assert.match(errors[1], /must match directory/);
});

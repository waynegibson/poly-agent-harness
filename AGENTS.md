# Repository instructions

This repository is the canonical source for skills shared across agent harnesses.

## Design rules

- Keep portable skills under `skills/` and harness-specific behavior under `harnesses/`.
- Use the strict Agent Skills subset in shared `SKILL.md` files: `name` and `description` are required.
- Match each skill directory basename to its frontmatter `name`.
- Use relative paths when a skill references its scripts, assets, or supporting documents.
- Never copy a portable skill into a harness directory. Install it with the CLI so the harness sees a symlink to the canonical source.
- Do not make an extension portable by hiding harness-specific assumptions. Put shared implementation in `shared/` and keep a thin adapter in each harness directory.
- Installation must be non-destructive. Never overwrite a real file, real directory, or unrelated symlink.

## Verification

Run `npm run check` after changing the CLI, configuration, or a skill.


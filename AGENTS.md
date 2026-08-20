# Repository instructions

This repository is the canonical source for skills shared across agent harnesses.

## Design rules

- Keep portable skills under `skills/` and installable extensions or plugins under `packages/`.
- Use the strict Agent Skills subset in shared `SKILL.md` files: `name` and `description` are required.
- Match each skill directory basename to its frontmatter `name`.
- Use relative paths when a skill references its scripts, assets, or supporting documents.
- Never copy a portable skill into a workspace package. Install it with the CLI so the harness sees a symlink to the canonical source.
- Each package must own the native manifests and installation instructions for the harnesses it actually supports.
- Do not make an extension portable by hiding harness-specific assumptions. Put code shared by multiple packages in `shared/` and keep harness-specific adapters in the package that publishes them.
- Installation must be non-destructive. Never overwrite a real file, real directory, or unrelated symlink.

## Verification

Run `pnpm run check` after changing the CLI, configuration, a package, or a skill.

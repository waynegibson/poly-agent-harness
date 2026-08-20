# Poly Agent Harness

`@spacecomx/poly-agent-harness` is one source of truth for portable agent skills
and installable agent extensions used by Codex, Pi, Claude Code, and Oh My Pi
(OMP).

Portable skills live exactly once under `skills/`. Independently versioned Pi
and OMP extensions live under `packages/`. The CLI installs selected skills as
symlinks, so editing or pulling the repository updates every harness that uses
them.

## Requirements

- Node.js 20 or newer
- pnpm 11.19 or newer
- macOS or Linux for the current symlink-based installer

The package has no runtime dependencies.

## Repository layout

```text
skills/                     Portable Agent Skills
packages/                   Independently publishable extensions and plugins
shared/                     Code shared by two or more workspace packages
scripts/                    Maintainer automation
src/                        Installer and validator implementation
tests/                      Automated tests
```

## Quick start

```bash
pnpm run validate
pnpm run list
```

After adding a skill, install it for every supported harness:

```bash
node ./bin/poly-agent-harness.mjs install my-skill --harness all
```

Install it for selected harnesses only:

```bash
node ./bin/poly-agent-harness.mjs install my-skill --harness codex,claude
```

Codex and Pi share `~/.agents/skills`, so requesting both creates only one link. Claude Code uses `~/.claude/skills`, and OMP uses `~/.omp/agent/skills`.

## User and project installation

User scope is the default:

```bash
pah install my-skill --harness all --scope user
```

For project-scoped installation, provide the project root explicitly:

```bash
pah install my-skill --harness all --scope project --project /path/to/project
```

Preview an operation without changing anything:

```bash
pah install my-skill --harness all --dry-run
```

Install all canonical skills:

```bash
pah install --all --harness all
```

## Safety behavior

The installer:

- creates one symlink per selected skill;
- treats an existing correct link as an idempotent success;
- refuses to overwrite real files or directories;
- refuses to replace a symlink pointing somewhere else;
- removes a link only when it points to the selected canonical skill;
- supports `--dry-run` for install and uninstall operations.

Resolve conflicts manually after inspecting both locations. There is intentionally no force flag.

## Commands

```text
pah list
pah validate
pah install <skill...> [--all] [--harness all|codex,pi,claude,omp]
pah uninstall <skill...> [--all] [--harness ...]
pah doctor [--harness ...]
```

Common options:

```text
--scope user|project    Installation scope; defaults to user
--project <path>        Project root for project scope; defaults to cwd
--home <path>           Override the home directory (useful in automation)
--dry-run               Report changes without writing them
```

## Add a portable skill

Create `skills/<name>/SKILL.md`:

```markdown
---
name: my-skill
description: Explain what the skill does and when an agent should use it.
---

# My skill

Give the agent imperative, testable instructions. Reference supporting files with paths relative to this directory.
```

Then run:

```bash
pnpm run check
pah install my-skill --harness all
```

## Install from GitHub

Consumers can ask their agent to install a particular `skills/<name>` directory from this repository's GitHub URL. Maintainers should clone this repository and use `pah install` so installed skills remain live symlinks to the editable source.

## Extension packages

Pi and OMP extensions that share an API-compatible implementation are
independent pnpm workspace packages under `packages/`. Each package owns its
version, npm metadata, harness manifests, tests, and installation instructions.

`@spacecomx/omlx-control` is currently distributed as source in this GitHub
repository and is not published to npm. Clone and pin the repository, then
install or link its workspace directory:

```bash
git clone https://github.com/waynegibson/poly-agent-harness.git
cd poly-agent-harness
git checkout <tag-or-commit>

pi install "$PWD/packages/omlx-control"
omp plugin link "$PWD/packages/omlx-control"
```

Direct Pi and OMP Git package specifications target the repository root and
cannot select an individual pnpm workspace package. A future npm publication
will enable the shorter harness-native package commands and Pi catalog
discovery.

Claude Code and Codex use plugin manifests and marketplaces rather than Pi/OMP
runtime extension packages. Add a real port as its own workspace package under
`packages/`. Each package must own the native manifest and marketplace metadata
for the harnesses it actually supports; do not label a Pi compatibility shim as
a Claude or Codex plugin.

Do not route extensions through the skill installer. Extensions may execute at
startup or receive broader privileges than on-demand skills, so installation
must remain explicit and harness-native.

## Workspace development

Install every workspace dependency and run the complete validation suite:

```bash
pnpm install
pnpm run check
```

Work with one extension package by name:

```bash
pnpm --filter @spacecomx/omlx-control run check
pnpm --filter @spacecomx/omlx-control pack
```

When a package is ready for its first npm release, publish it independently from
a clean release commit:

```bash
pnpm --filter @spacecomx/omlx-control publish --access public
```

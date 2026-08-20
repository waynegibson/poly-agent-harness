# Poly Agent Harness

`@spacecomx/poly-agent-harness` is one source of truth for portable agent skills and harness-specific extensions used by Codex, Pi, Claude Code, and Oh My Pi (OMP).

Portable skills live exactly once under `skills/`. The CLI installs selected skills as symlinks, so editing or pulling the repository updates every harness that uses them.

## Requirements

- Node.js 20 or newer
- macOS or Linux for the current symlink-based installer

The package has no runtime dependencies.

## Repository layout

```text
skills/                     Portable Agent Skills
harnesses/
  codex/                    Codex-only plugins and configuration
  pi/                       Pi-only extensions and configuration
  claude/                   Claude-only plugins, commands, agents, and hooks
  omp/                      OMP-only extensions and configuration
shared/                     Code shared by two or more harness adapters
scripts/                    Maintainer automation
src/                        Installer and validator implementation
tests/                      Automated tests
```

## Quick start

```bash
npm run validate
npm run list
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
npm run check
pah install my-skill --harness all
```

## Install from GitHub

Consumers can ask their agent to install a particular `skills/<name>` directory from this repository's GitHub URL. Maintainers should clone this repository and use `pah install` so installed skills remain live symlinks to the editable source.

## Extensions

Extensions are not assumed to be portable. Add them beneath the appropriate `harnesses/<name>/extensions/` directory and document their harness-native installation procedure. When two adapters share implementation, place that implementation in `shared/` and import it from thin harness adapters.

Do not route extensions through the skill installer. An extension may execute at startup or receive broader privileges than an on-demand skill, so each harness requires an explicit adapter and installation review.


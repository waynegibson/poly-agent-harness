# Poly Agent Harness

`@spacecomx/poly-agent-harness` is one source of truth for portable agent skills
and installable extensions used by Codex, Pi, Claude Code, and Oh My Pi (OMP).

Portable skills live once under `skills/`. Independently versioned extensions
live under `packages/`. The repository CLI installs selected skills as symlinks,
so edits and pulls are reflected in every linked harness without copying files.

See [INSTALL.md](INSTALL.md) for the concise installation and removal guide.

## Requirements

- Git
- Node.js 20 or newer
- pnpm 11.19 or newer
- macOS or Linux for the current symlink-based skill installer

Use [Corepack](https://nodejs.org/api/corepack.html) to activate the pnpm version
declared in `package.json`, if pnpm is not already available:

```bash
corepack enable
corepack install
```

## Clone and validate

```bash
git clone https://github.com/waynegibson/poly-agent-harness.git
cd poly-agent-harness
pnpm install --frozen-lockfile
pnpm run check
```

Use `pnpm install` instead while intentionally updating dependencies or the
lockfile. All CLI examples below run the repository binary directly, so a global
installation or unpublished npm package is not required.

## Repository layout

```text
skills/                     Canonical portable Agent Skills
packages/                   Independently versioned extensions and plugins
shared/                     Material shared by two or more packages
src/                        Skill installer and validator implementation
tests/                      Installer and validator tests
schemas/                    Configuration schema
polyharness.config.json     Harness destinations
```

## Install portable skills

List and validate the canonical skills before installing them:

```bash
pnpm run list
pnpm run validate
```

User scope is the default. Install a skill for every configured harness:

```bash
node ./bin/poly-agent-harness.mjs install grill-me --harness all
```

Install one or more skills for selected harnesses:

```bash
node ./bin/poly-agent-harness.mjs install grill-me unslop --harness codex,claude
```

Install all canonical skills:

```bash
node ./bin/poly-agent-harness.mjs install --all --harness all
```

For project scope, pass the project root explicitly:

```bash
node ./bin/poly-agent-harness.mjs install grill-me \
  --harness all \
  --scope project \
  --project /path/to/project
```

Preview any install or uninstall operation without changing the filesystem:

```bash
node ./bin/poly-agent-harness.mjs install grill-me --harness all --dry-run
```

The configured destinations are:

| Harness | User scope | Project scope |
| --- | --- | --- |
| Codex | `~/.agents/skills` | `<project>/.agents/skills` |
| Pi | `~/.agents/skills` | `<project>/.agents/skills` |
| Claude Code | `~/.claude/skills` | `<project>/.claude/skills` |
| OMP | `~/.omp/agent/skills` | `<project>/.omp/skills` |

Codex and Pi intentionally share the standard `.agents/skills` location, so
selecting both produces one link per skill. Codex, Pi, and Claude Code support
symlinked skill directories. Restart a harness if a newly created top-level
skills directory is not detected in the current session.

See the official skill-location documentation for [Codex](https://developers.openai.com/codex/skills/#where-codex-loads-local-skills),
[Pi](https://pi.dev/docs/latest/skills#locations), and
[Claude Code](https://code.claude.com/docs/en/skills#where-skills-live).

The links depend on this checkout remaining at the same absolute path. Move or
delete the checkout only after uninstalling its linked skills.

### CLI commands

```text
node ./bin/poly-agent-harness.mjs list
node ./bin/poly-agent-harness.mjs validate
node ./bin/poly-agent-harness.mjs install <skill...> [--all] [--harness all|codex,pi,claude,omp]
node ./bin/poly-agent-harness.mjs uninstall <skill...> [--all] [--harness ...]
node ./bin/poly-agent-harness.mjs doctor [--harness ...]
```

Common options:

```text
--scope user|project    Installation scope; defaults to user
--project <path>        Project root for project scope; defaults to cwd
--home <path>           Override the home directory for automation or testing
--dry-run               Report changes without writing them
```

After installation, inspect every link with:

```bash
pnpm run doctor
```

### Safety behavior

The skill installer:

- creates one symlink per selected canonical skill;
- treats an existing correct link as an idempotent success;
- refuses to overwrite real files or directories;
- refuses to replace a symlink pointing somewhere else;
- removes a link only when it points to the selected canonical skill;
- supports `--dry-run` for install and uninstall operations.

Resolve conflicts manually after inspecting both locations. There is no force
flag.

### Install a single skill from GitHub

For a one-off consumer install, give the harness's skill installer the URL of
the individual skill directory, for example:

```text
Install the skill from
https://github.com/waynegibson/poly-agent-harness/tree/main/skills/grill-me
```

This delegates downloading and trust decisions to that harness and produces a
separate installed copy. Codex supports this workflow through its built-in
`$skill-installer`. Harness behavior differs, so use the local CLI workflow
above when you want one editable checkout shared by all four harnesses.

## Add or update a portable skill

Create `skills/<name>/SKILL.md`:

```markdown
---
name: my-skill
description: Explain what the skill does and when an agent should use it.
---

# My skill

Give the agent imperative, testable instructions. Reference supporting files
with paths relative to this directory.
```

Optional supporting directories include `agents/`, `assets/`, `references/`,
and `scripts/`. Put OpenAI-specific UI metadata or invocation policy in
`agents/openai.yaml`; keep the core `SKILL.md` portable.

Then validate and install the new skill:

```bash
pnpm run check
node ./bin/poly-agent-harness.mjs install my-skill --harness all
```

Because installed skills are symlinks, later edits need no reinstall. If you
rename a skill, uninstall the old name before installing the new name.

## Install extension packages

Extensions are executable code and must be reviewed before installation. They
do not go through the portable skill installer.

The workspace packages are currently distributed from this GitHub repository,
not from npm. From a cloned checkout pinned to a tag or commit, install or link
the specific workspace directory.

| Package | Harness support | Additional requirements |
| --- | --- | --- |
| `@spacecomx/pi-control-omlx` | Pi and OMP | A reachable oMLX server |
| `@spacecomx/pi-dictate-deepgram` | Pi only | SoX and a Deepgram API key |

### Pi

Pi accepts a local package directory and records the path without copying it:

```bash
pi install "$PWD/packages/pi-control-omlx"
pi install "$PWD/packages/pi-dictate-deepgram"
pi list
```

Remove a local package using the same path specification:

```bash
pi remove "$PWD/packages/pi-control-omlx"
```

Reload or restart Pi after changing extension source if the running session
does not pick up the change.

See [Pi packages](https://pi.dev/docs/latest/packages) for its complete package
source, update, and removal behavior.

### OMP

OMP's `plugin link` command is intended for local plugin development:

```bash
omp plugin link "$PWD/packages/pi-control-omlx"
omp plugin list
omp plugin doctor
```

Use `omp plugin uninstall @spacecomx/pi-control-omlx` to remove the link.

Direct Pi and OMP Git package specifications point at the repository root; they
cannot select an individual pnpm workspace in this monorepo. Continue using the
local workspace paths until a package is published to npm or moved to its own
repository. Do not run `pi install git:github.com/waynegibson/poly-agent-harness`
or its OMP equivalent for these nested packages.

Read each package's own instructions before installing it:

- [`packages/pi-control-omlx/README.md`](packages/pi-control-omlx/README.md)
- [`packages/pi-dictate-deepgram/README.md`](packages/pi-dictate-deepgram/README.md)
- [`packages/pi-dictate-deepgram/SECURITY.md`](packages/pi-dictate-deepgram/SECURITY.md)

Claude Code and Codex plugins use their own manifests and distribution systems;
Pi or OMP runtime extensions do not port automatically. Add a real port as a
separate package with native manifests, tests, and installation documentation.

## Update a checkout

For a branch checkout that should track upstream changes:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm run check
pnpm run doctor
```

Skill links immediately reflect pulled changes. Pi and OMP local package
references also continue to target the checkout, but a running harness may need
a reload or restart after extension code changes. Pin a release tag or commit
when reproducibility matters; track a development branch only when you want
live changes.

## Workspace development

Run the complete validation suite:

```bash
pnpm run check
```

This validates the repository configuration and every skill, type-checks each
workspace package, and runs all Vitest projects. During development:

```bash
pnpm test
pnpm run test:watch
pnpm run test:coverage
```

Run one package's checks:

```bash
pnpm --filter @spacecomx/pi-control-omlx run check
pnpm --filter @spacecomx/pi-dictate-deepgram run check
```

Create an npm tarball to inspect package contents without publishing:

```bash
pnpm --filter @spacecomx/pi-control-omlx pack
pnpm --filter @spacecomx/pi-dictate-deepgram pack
```

Registry dependency ranges are centralized in the default `catalog` in
`pnpm-workspace.yaml`. Workspace manifests reference them with `"catalog:"`.
New Pi, OMP, Codex, or Claude packages should reuse catalog entries for shared
SDKs and tooling; add a new entry when a dependency needs one workspace-wide
range. Keep host-supplied peer dependency ranges explicit in the package that
declares them.

To upgrade a catalog dependency, edit its range in `pnpm-workspace.yaml`, run
`pnpm install`, inspect the workspace file, affected package manifests, and
`pnpm-lock.yaml`, then rerun `pnpm run check`. CI and clean checkouts should use
`pnpm install --frozen-lockfile`.

### Package releases

Workspace packages are versioned independently. Before the first npm release,
confirm the package version, metadata, packed file list, license, changelog, and
release tag from a clean commit. Then publish only the intended package:

```bash
pnpm --filter @spacecomx/pi-control-omlx publish --access public
```

Do not advertise an npm install command until the corresponding package has
actually been published.

## License

The repository is licensed under the [MIT License](LICENSE.md). Individual
packages retain their own license files and any required upstream attribution.

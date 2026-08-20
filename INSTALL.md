# Installation

## Prepare the checkout

Requirements: Git, Node.js 20 or newer, pnpm 11.19 or newer, and the harnesses
you plan to use.

```bash
git clone https://github.com/waynegibson/poly-agent-harness.git
cd poly-agent-harness
pnpm install --frozen-lockfile
pnpm run check
```

All commands below run from the repository root.

## Skills

List the canonical skills:

```bash
pnpm run list
```

Install every skill for Codex, Pi, Claude Code, and OMP:

```bash
node ./bin/poly-agent-harness.mjs install --all --harness all
pnpm run doctor
```

Codex and Pi share `~/.agents/skills`. Claude Code uses
`~/.claude/skills`, and OMP uses `~/.omp/agent/skills`.

### Install selected skills

Install one skill for every harness:

```bash
node ./bin/poly-agent-harness.mjs install unslop --harness all
```

Install one or more skills for selected harnesses:

```bash
node ./bin/poly-agent-harness.mjs install unslop writing-for-agents \
  --harness codex,claude
```

Preview the operation first when needed:

```bash
node ./bin/poly-agent-harness.mjs install unslop --harness all --dry-run
```

For project scope:

```bash
node ./bin/poly-agent-harness.mjs install unslop \
  --harness all \
  --scope project \
  --project /path/to/project
```

### Remove skills

Remove one skill from every harness:

```bash
node ./bin/poly-agent-harness.mjs uninstall unslop --harness all
```

Remove it from selected harnesses only:

```bash
node ./bin/poly-agent-harness.mjs uninstall unslop --harness claude,omp
```

Remove every managed skill link:

```bash
node ./bin/poly-agent-harness.mjs uninstall --all --harness all
```

The uninstaller removes a symlink only when it points to the corresponding
skill in this checkout. It does not delete the canonical skill source.

## Extensions

These extensions are local Pi packages inside the monorepo. They are not
published to npm. Pi records each local directory in the `packages` array of
`~/.pi/agent/settings.json` without copying it. Do not also add the same entry
to the `extensions` array.

### Pi Control for oMLX

Create `~/.pi/agent/pi-control-omlx.json`:

```json
{
  "baseUrl": "http://127.0.0.1:8055",
  "timeoutMs": 10000
}
```

The legacy filename `omlx-control.json` also works.

Install the local package in Pi:

```bash
pi install "$PWD/packages/pi-control-omlx"
pi list
```

Reload Pi and test:

```text
/reload
/omlx
/omlx status
```

Link the same package for OMP:

```bash
omp plugin link "$PWD/packages/pi-control-omlx"
omp plugin list
omp plugin doctor
```

If OMP does not share Pi's agent configuration directory, copy the oMLX JSON
configuration to `~/.omp/agent/pi-control-omlx.json`. Restart OMP, then test
`/omlx`.

### Pi Dictate with Deepgram

Install SoX and confirm that `rec` is available:

```bash
brew install sox
command -v rec
```

Make these variables available to the process that launches Pi:

```dotenv
DEEPGRAM_API_KEY=dg_your_key
PI_DICTATE_MODEL=nova-3
PI_DICTATE_LANGUAGE=en-US
```

Pi does not load `.env` files automatically. If you keep these values in a
private `.env`, load that file from a Pi launcher or shell function. Keep it out
of Git and set its permissions to `600`.

Install the local package:

```bash
pi install "$PWD/packages/pi-dictate-deepgram"
pi list
```

Reload Pi. Use `alt+m` to start or stop recording and `alt+n` to cancel.

### Remove extensions

Use the same local source paths with Pi:

```bash
pi remove "$PWD/packages/pi-control-omlx"
pi remove "$PWD/packages/pi-dictate-deepgram"
```

Remove the OMP plugin link by package name:

```bash
omp plugin uninstall @spacecomx/pi-control-omlx
```

Configuration files are retained and can be removed separately.

## Update

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm run check
pnpm run doctor
```

Skill symlinks and local extension registrations continue to point to this
checkout. Reload or restart each harness after extension code changes.

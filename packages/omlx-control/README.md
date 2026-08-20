# omlx-control

A Pi and OMP extension for inspecting oMLX models and switching their saved profiles.

## Install from GitHub

`@spacecomx/omlx-control` is not published to npm yet. Clone the GitHub
repository, check out the commit or tag you want to pin, and install the package
from its workspace directory:

```bash
git clone https://github.com/waynegibson/poly-agent-harness.git
cd poly-agent-harness
git checkout <tag-or-commit>

pi install "$PWD/packages/omlx-control"
omp plugin link "$PWD/packages/omlx-control"
```

Pi and OMP Git package specifications target a repository root; they cannot
select `packages/omlx-control` from this monorepo directly. Until a standalone
release repository or npm package exists, use the clone-plus-local-package flow
above.

The package declares native `pi.extensions` and `omp.extensions` entry points in
`package.json`. Review extension source before installing it: extensions execute
with the harness process's system permissions.

## Command

One compact command replaces the previous three long commands:

```text
/omlx                               List visible models
/omlx status [model]                Show model status (alias: s)
/omlx profiles [model]              List profiles (uses the loaded/default model when omitted)
/omlx p [model]                     Alias for profiles
/omlx diff <left> <right> [model]   Compare profile settings
/omlx use [profile] [model]         Apply a profile; opens a picker when profile is omitted
```

Examples:

```text
/omlx
/omlx status
/omlx p Qwen3.6-35B-A3B-oQ8e-fp16-mtp
/omlx diff coder general
/omlx use
/omlx use general Qwen3.6-35B-A3B-oQ8e-fp16-mtp
```

## Configuration

The extension stores configuration beside the active harness's agent settings.
For Pi, that is `~/.pi/agent/omlx-control.json`; OMP resolves its corresponding
agent configuration directory through the compatibility API. Copy the package's
`omlx-control.example.json` there, then edit it:

```json
{
  "baseUrl": "http://127.0.0.1:8000",
  "timeoutMs": 10000
}
```

`timeoutMs` is capped at 60,000 ms. For one-off runs and automation, environment variables take precedence over this file:

```bash
OMLX_BASE_URL=http://omlx-host:8000 OMLX_REQUEST_TIMEOUT_MS=15000 pi
```

Reload the harness after changing the JSON file. The extension only calls oMLX's
model and profile Admin API endpoints; `/omlx use` is the sole mutating operation.

## Development

```bash
pnpm install
pnpm --filter @spacecomx/omlx-control run check
```

Reload Pi after editing an auto-discovered extension with `/reload`; restart or
reload OMP according to the active plugin workflow.

## License

MIT

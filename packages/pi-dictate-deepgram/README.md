# Pi Dictate — Deepgram

`@spacecomx/pi-dictate-deepgram` is a Pi-only voice dictation extension derived from
[amosblomqvist/pi-dictate](https://github.com/amosblomqvist/pi-dictate). It
streams microphone audio to Deepgram and appends finalized text to the focused
Pi editor.

This source package is currently distributed through the
`poly-agent-harness` GitHub repository; it is not published to npm yet.

## Compatibility

- Pi `0.84.2` is the type-checked target. A live integration test is still
  required on a machine with SoX, microphone permission, and a Deepgram key.
- macOS and Linux are supported where SoX provides the `rec` command.
- OMP is intentionally not declared. This extension depends on Pi's extension
  lifecycle, TUI key handling, widget factory, and focused-component behavior.
  A separate OMP adapter should be created only after compatibility tests pass.

## Install from this monorepo

Direct Pi Git package specifications select a repository root, not a pnpm
workspace inside that repository. Clone and pin the monorepo, then install the
package directory:

```bash
git clone https://github.com/waynegibson/poly-agent-harness.git
cd poly-agent-harness
git checkout <tag-or-commit>
pi install "$PWD/packages/pi-dictate-deepgram"
```

During development, reload Pi after editing the package:

```text
/reload
```

## Prerequisites

Install SoX and export a Deepgram API key in the shell that launches Pi:

```bash
brew install sox
export DEEPGRAM_API_KEY=dg_xxxxxxxxxxxxxxxx
```

On Linux, use your distribution's SoX package. Your terminal may also require
microphone permission from the operating system.

Optional settings:

```bash
export PI_DICTATE_MODEL=nova-3
export PI_DICTATE_LANGUAGE=en-US
```

Both values are validated before they are added to the fixed Deepgram TLS
endpoint. The API key is sent in an `Authorization` header and is never placed
in the URL or written to a debug log.

## Usage

- `alt+m`: connect and start recording; press it again to stop and finalize.
- `alt+n`: cancel and discard the current dictation.
- `/dictate-insert`: insert a transcript retained because focus moved away
  from a verified text editor before finalization completed.

The extension only inserts text through components that expose the expected
editor interface. It does not synthesize keystrokes into opaque dialogs and it
does not put transcripts on the system clipboard automatically.

## Data flow

1. The extension starts a TLS WebSocket connection to Deepgram.
2. After the connection opens, it spawns `rec` without a shell and captures
   16 kHz, mono, signed 16-bit PCM.
3. Audio is sent while recording. Only validated final transcript messages are
   retained, with bounded frame, queue, segment, and total transcript sizes.
4. Stopping sends Deepgram's `CloseStream` message, waits up to three seconds
   for final results, then disposes the recorder, socket, timers, and listeners.

See [SECURITY.md](SECURITY.md) before installing. Pi extensions execute with
the same operating-system permissions as Pi.

## Development

From the monorepo root:

```bash
pnpm install
pnpm --filter @spacecomx/pi-dictate-deepgram run check
pnpm --filter @spacecomx/pi-dictate-deepgram pack
```

The MIT license and original copyright notice are preserved in
[LICENSE](LICENSE).

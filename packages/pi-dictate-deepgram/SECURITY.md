# Security and privacy

Pi extensions are executable code, not passive prompt files. Review the source
and pin a trusted commit before installing this package.

## External access

- Microphone: SoX `rec` captures microphone audio only between a successful
  Deepgram connection and stop/cancel/shutdown.
- Network: raw audio is transmitted to `wss://api.deepgram.com/v1/listen` for
  transcription. Deepgram's terms, retention, regional processing, and account
  settings apply.
- Credentials: `DEEPGRAM_API_KEY` is read from the process environment and sent
  in the WebSocket `Authorization` header. It is not included in the endpoint,
  status messages, errors, or logs.
- Local storage: the extension writes no audio, transcripts, or debug logs to
  disk. It does not copy transcripts to the clipboard.

## Defensive controls

- `rec` is launched with a fixed executable and fixed arguments, with
  `shell: false`.
- The WebSocket uses TLS verification defaults, refuses redirects, disables
  compression, limits inbound frames, times out its handshake, and bounds its
  outgoing audio queue.
- Deepgram responses cross a runtime-validation boundary before reaching
  internal state. Control characters that could affect a terminal are removed.
- Cancel and Pi shutdown discard in-flight text and terminate child-process,
  socket, timer, and input-listener resources.
- A narrow runtime adapter contains the one dependency on Pi's currently
  non-public `focusedComponent` property. If that property disappears, the
  extension refuses focus-aware insertion instead of treating an unknown
  component as an editor.

## Remaining trust assumptions

- Pi, Node.js, SoX, the operating system's audio stack, and Deepgram are trusted
  dependencies.
- A process with the same user privileges may read environment variables or
  interfere with child processes.
- Network transcription inherently discloses recorded speech to Deepgram.
- The focused-component adapter relies on Pi runtime behavior not represented
  by its public TypeScript interface. This is a compatibility risk, isolated in
  `src/focus.ts`, rather than a privilege-escalation mechanism.

Do not use the extension for sensitive speech unless Deepgram's processing and
retention controls meet your requirements.

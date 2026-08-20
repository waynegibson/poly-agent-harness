import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { isKeyRelease, isKeyRepeat, Key, matchesKey } from "@earendil-works/pi-tui";
import { rmsFromPcm16, startRecorder, type Recorder } from "./audio.js";
import { readConfig } from "./config.js";
import { openDeepgramStream, type DeepgramStream } from "./deepgram.js";
import { appendToEditor, createRuntimeTui, resolveFocusedEditor, type RuntimeTui } from "./focus.js";
import { joinTranscript, MAX_TRANSCRIPT_CHARS } from "./transcript.js";

const FINALIZE_TIMEOUT_MS = 3_000;
const METER_THROTTLE_MS = 80;
const LEVEL_BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

interface SessionBase {
  readonly id: number;
  readonly ctx: ExtensionContext;
  readonly stream: DeepgramStream;
  readonly finals: string[];
  transcriptChars: number;
  lastMeterAt: number;
}

type ActiveSession =
  | (SessionBase & { readonly phase: "connecting"; readonly recorder: null })
  | (SessionBase & { readonly phase: "recording"; readonly recorder: Recorder })
  | (SessionBase & {
      readonly phase: "stopping";
      readonly recorder: Recorder;
      readonly finalizeTimer: NodeJS.Timeout;
    });

function levelBlock(rms: number): string {
  if (rms <= 0) return LEVEL_BLOCKS[0];
  const decibels = 20 * Math.log10(rms);
  const normalized = Math.max(0, Math.min(1, (decibels + 50) / 40));
  return LEVEL_BLOCKS[Math.floor(normalized * (LEVEL_BLOCKS.length - 1))] ?? LEVEL_BLOCKS[0];
}

function appendToMainEditor(ctx: ExtensionContext, transcript: string): void {
  const current = ctx.ui.getEditorText() ?? "";
  const separator = current && !/\s$/.test(current) ? " " : "";
  ctx.ui.setEditorText(`${current}${separator}${transcript}`);
}

export default function piDictateDeepgram(pi: ExtensionAPI): void {
  let session: ActiveSession | null = null;
  let nextSessionId = 0;
  let lastCtx: ExtensionContext | null = null;
  let tui: RuntimeTui | null = null;
  let removeInputListener: (() => void) | null = null;
  let pendingTranscript: string | null = null;

  const isCurrent = (id: number): boolean => session?.id === id;

  const setStatus = (ctx: ExtensionContext, value: string | undefined): void => {
    ctx.ui.setStatus("pi-dictate-deepgram", value);
  };

  const deliverTranscript = (ctx: ExtensionContext, transcript: string): void => {
    if (!tui) {
      appendToMainEditor(ctx, transcript);
      pendingTranscript = null;
      return;
    }

    const editor = resolveFocusedEditor(tui);
    if (editor) {
      appendToEditor(editor, transcript);
      tui.requestRender();
      pendingTranscript = null;
      return;
    }

    pendingTranscript = transcript;
    ctx.ui.notify("Transcript retained but not inserted. Focus the main editor and run /dictate-insert.", "warning");
  };

  const finish = (id: number, deliver: boolean): void => {
    if (!session || session.id !== id) return;
    const completed = session;
    session = null;

    if (completed.phase === "stopping") clearTimeout(completed.finalizeTimer);
    completed.recorder?.stop();
    completed.stream.dispose();
    setStatus(completed.ctx, undefined);

    if (!deliver) return;
    const transcript = joinTranscript(completed.finals);
    if (transcript) deliverTranscript(completed.ctx, transcript);
  };

  const stop = (): void => {
    if (!session) return;
    if (session.phase === "connecting") {
      session.ctx.ui.notify("Dictation cancelled before the connection opened", "info");
      finish(session.id, false);
      return;
    }
    if (session.phase === "stopping") return;

    const recording = session;
    recording.recorder.stop();
    setStatus(recording.ctx, "finalizing dictation…");
    if (!recording.stream.requestClose()) {
      finish(recording.id, true);
      return;
    }

    const finalizeTimer = setTimeout(() => finish(recording.id, true), FINALIZE_TIMEOUT_MS);
    finalizeTimer.unref();
    session = { ...recording, phase: "stopping", finalizeTimer };
  };

  const cancel = (): void => {
    if (!session) return;
    const id = session.id;
    session.ctx.ui.notify("Dictation cancelled", "info");
    finish(id, false);
  };

  const handleOpen = (id: number): void => {
    if (!session || session.id !== id || session.phase !== "connecting") return;
    const connecting = session;
    const recorder = startRecorder({
      onAudio(chunk) {
        if (!session || session.id !== id || session.phase !== "recording") return;
        if (!session.stream.sendAudio(chunk)) {
          session.ctx.ui.notify("Dictation stopped because audio could not be sent safely", "error");
          finish(id, true);
          return;
        }
        const now = Date.now();
        if (now - session.lastMeterAt >= METER_THROTTLE_MS) {
          session.lastMeterAt = now;
          setStatus(session.ctx, `● ${levelBlock(rmsFromPcm16(chunk))} listening…`);
        }
      },
      onError() {
        if (!isCurrent(id)) return;
        session?.ctx.ui.notify("Unable to run SoX 'rec'. Install SoX and check microphone permission.", "error");
        finish(id, true);
      },
      onExit(event) {
        if (!isCurrent(id) || event.expected) return;
        session?.ctx.ui.notify("The audio recorder exited unexpectedly; finalizing available speech.", "warning");
        stop();
      },
    });
    session = { ...connecting, phase: "recording", recorder };
    setStatus(connecting.ctx, "● ▁ listening…");
  };

  const start = (ctx: ExtensionContext): void => {
    const config = readConfig();
    if (!config.ok) {
      ctx.ui.notify(config.message, "error");
      return;
    }
    if (tui && !resolveFocusedEditor(tui)) {
      ctx.ui.notify("Focus a text editor before starting dictation", "warning");
      return;
    }

    const id = ++nextSessionId;
    const finals: string[] = [];
    const stream = openDeepgramStream(config.value, {
      onOpen: () => handleOpen(id),
      onTranscript(transcript) {
        if (!session || session.id !== id) return;
        if (session.transcriptChars + transcript.length > MAX_TRANSCRIPT_CHARS) {
          session.ctx.ui.notify("Dictation reached the transcript size limit and is being finalized", "warning");
          stop();
          return;
        }
        session.transcriptChars += transcript.length;
        session.finals.push(transcript);
      },
      onError() {
        if (!isCurrent(id)) return;
        session?.ctx.ui.notify("Deepgram connection failed", "error");
        finish(id, true);
      },
      onClose(code) {
        if (!isCurrent(id)) return;
        if (session?.phase !== "stopping" && code !== 1000) {
          session?.ctx.ui.notify(`Deepgram closed unexpectedly (code ${code})`, "warning");
        }
        finish(id, true);
      },
    });

    session = {
      id,
      phase: "connecting",
      ctx,
      stream,
      recorder: null,
      finals,
      transcriptChars: 0,
      lastMeterAt: 0,
    };
    setStatus(ctx, "connecting dictation…");
  };

  const toggle = (ctx: ExtensionContext): void => {
    lastCtx = ctx;
    if (!session) start(ctx);
    else stop();
  };

  const onGlobalInput = (data: string) => {
    if (isKeyRelease(data) || isKeyRepeat(data)) return undefined;
    if (matchesKey(data, Key.alt("m"))) {
      if (lastCtx) toggle(lastCtx);
      return { consume: true };
    }
    if (matchesKey(data, Key.alt("n"))) {
      cancel();
      return { consume: true };
    }
    return undefined;
  };

  pi.on("session_start", (_event, ctx) => {
    lastCtx = ctx;
    if (ctx.mode !== "tui") return;
    ctx.ui.setWidget("pi-dictate-deepgram-tui", (piTui) => {
      removeInputListener?.();
      tui = createRuntimeTui(piTui);
      removeInputListener = tui?.addInputListener(onGlobalInput) ?? null;
      return { render: () => [], invalidate: () => undefined };
    });
  });

  pi.registerShortcut(Key.alt("m"), {
    description: "Toggle voice dictation",
    handler: async (ctx) => toggle(ctx),
  });

  pi.registerShortcut(Key.alt("n"), {
    description: "Cancel voice dictation",
    handler: async () => cancel(),
  });

  pi.registerCommand("dictate-insert", {
    description: "Insert the last retained dictation into the main editor",
    handler: async (_args, ctx) => {
      if (!pendingTranscript) {
        ctx.ui.notify("No retained dictation is available", "info");
        return;
      }
      appendToMainEditor(ctx, pendingTranscript);
      pendingTranscript = null;
      ctx.ui.notify("Retained dictation inserted", "info");
    },
  });

  pi.on("session_shutdown", () => {
    if (session) finish(session.id, false);
    removeInputListener?.();
    removeInputListener = null;
    tui = null;
    lastCtx = null;
    pendingTranscript = null;
  });
}

import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

const FORCE_KILL_AFTER_MS = 750;

export interface RecorderExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly expected: boolean;
}

export interface RecorderCallbacks {
  readonly onAudio: (chunk: Buffer) => void;
  readonly onError: (message: string) => void;
  readonly onExit: (event: RecorderExit) => void;
}

export interface Recorder {
  stop(): void;
}

export function rmsFromPcm16(buffer: Buffer): number {
  const sampleCount = Math.floor(buffer.length / 2);
  if (sampleCount === 0) return 0;

  let sumSquares = 0;
  for (let offset = 0; offset < sampleCount * 2; offset += 2) {
    const sample = buffer.readInt16LE(offset);
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / sampleCount) / 32_768;
}

export function startRecorder(callbacks: RecorderCallbacks): Recorder {
  const processHandle: ChildProcessByStdio<null, Readable, Readable> = spawn(
    "rec",
    [
      "-q",
      "--buffer",
      "512",
      "-r",
      "16000",
      "-c",
      "1",
      "-b",
      "16",
      "-e",
      "signed-integer",
      "-t",
      "raw",
      "-",
    ],
    { stdio: ["ignore", "pipe", "pipe"], shell: false },
  );

  let stopping = false;
  let forceKillTimer: NodeJS.Timeout | undefined;

  processHandle.stdout.on("data", (chunk: Buffer) => callbacks.onAudio(chunk));
  processHandle.stderr.resume();
  processHandle.once("error", (error) => callbacks.onError(error.message));
  processHandle.once("exit", (code, signal) => {
    if (forceKillTimer) clearTimeout(forceKillTimer);
    callbacks.onExit({ code, signal, expected: stopping });
  });

  return {
    stop() {
      if (stopping || processHandle.exitCode !== null || processHandle.signalCode !== null) return;
      stopping = true;
      processHandle.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (processHandle.exitCode === null && processHandle.signalCode === null) {
          processHandle.kill("SIGKILL");
        }
      }, FORCE_KILL_AFTER_MS);
      forceKillTimer.unref();
    },
  };
}

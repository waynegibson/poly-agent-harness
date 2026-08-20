import WebSocket, { type RawData } from "ws";
import type { DictateConfig } from "./config.js";
import { extractFinalTranscript } from "./transcript.js";

const HANDSHAKE_TIMEOUT_MS = 10_000;
const MAX_BUFFERED_AUDIO_BYTES = 4 * 1_048_576;

export interface DeepgramCallbacks {
  readonly onOpen: () => void;
  readonly onTranscript: (transcript: string) => void;
  readonly onError: () => void;
  readonly onClose: (code: number) => void;
}

export interface DeepgramStream {
  sendAudio(chunk: Buffer): boolean;
  requestClose(): boolean;
  dispose(): void;
}

export function openDeepgramStream(config: DictateConfig, callbacks: DeepgramCallbacks): DeepgramStream {
  const socket = new WebSocket(config.endpoint, {
    headers: { Authorization: `Token ${config.apiKey}` },
    followRedirects: false,
    handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
    maxPayload: 1_048_576,
    perMessageDeflate: false,
  });

  let disposed = false;
  let errorReported = false;

  socket.once("open", callbacks.onOpen);
  socket.on("message", (frame: RawData) => {
    const transcript = extractFinalTranscript(frame);
    if (transcript) callbacks.onTranscript(transcript);
  });
  socket.once("error", () => {
    if (disposed || errorReported) return;
    errorReported = true;
    callbacks.onError();
  });
  socket.once("close", (code) => {
    if (!disposed) callbacks.onClose(code);
  });

  return {
    sendAudio(chunk) {
      if (disposed || socket.readyState !== WebSocket.OPEN) return false;
      if (socket.bufferedAmount + chunk.byteLength > MAX_BUFFERED_AUDIO_BYTES) return false;
      try {
        socket.send(chunk, { binary: true });
        return true;
      } catch {
        return false;
      }
    },
    requestClose() {
      if (disposed || socket.readyState !== WebSocket.OPEN) return false;
      try {
        socket.send(JSON.stringify({ type: "CloseStream" }));
        return true;
      } catch {
        return false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
        socket.terminate();
      }
      socket.removeAllListeners();
    },
  };
}

const MAX_FRAME_BYTES = 1_048_576;
export const MAX_TRANSCRIPT_CHARS = 100_000;
const MAX_SEGMENT_CHARS = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeFrame(value: unknown): string | null {
  if (typeof value === "string") {
    return Buffer.byteLength(value, "utf8") <= MAX_FRAME_BYTES ? value : null;
  }
  if (Buffer.isBuffer(value)) {
    return value.byteLength <= MAX_FRAME_BYTES ? value.toString("utf8") : null;
  }
  if (value instanceof ArrayBuffer) {
    return value.byteLength <= MAX_FRAME_BYTES ? Buffer.from(value).toString("utf8") : null;
  }
  if (ArrayBuffer.isView(value)) {
    return value.byteLength <= MAX_FRAME_BYTES
      ? Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("utf8")
      : null;
  }
  if (Array.isArray(value) && value.every(Buffer.isBuffer)) {
    const size = value.reduce((total, part) => total + part.byteLength, 0);
    return size <= MAX_FRAME_BYTES ? Buffer.concat(value).toString("utf8") : null;
  }
  return null;
}

export function extractFinalTranscript(frame: unknown): string | null {
  const text = decodeFrame(frame);
  if (text === null) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(payload) || payload.type !== "Results" || payload.is_final !== true) return null;
  const channel = payload.channel;
  if (!isRecord(channel) || !Array.isArray(channel.alternatives)) return null;
  const first = channel.alternatives[0];
  if (!isRecord(first) || typeof first.transcript !== "string") return null;
  if (first.transcript.length > MAX_SEGMENT_CHARS) return null;

  const normalized = normalizeTranscript(first.transcript);
  return normalized || null;
}

export function normalizeTranscript(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "")
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function joinTranscript(segments: readonly string[]): string {
  return normalizeTranscript(segments.join(" ")).slice(0, MAX_TRANSCRIPT_CHARS);
}

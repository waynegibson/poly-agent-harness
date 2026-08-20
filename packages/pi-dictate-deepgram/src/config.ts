const MODEL_PATTERN = /^[a-zA-Z0-9._-]{1,64}$/;
const LANGUAGE_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/;

export interface DictateConfig {
  readonly apiKey: string;
  readonly endpoint: URL;
}

export type ConfigResult =
  | { readonly ok: true; readonly value: DictateConfig }
  | { readonly ok: false; readonly message: string };

function optionalIdentifier(
  value: string | undefined,
  fallback: string,
  pattern: RegExp,
  label: string,
): ConfigResult | string {
  const candidate = value?.trim() || fallback;
  return pattern.test(candidate)
    ? candidate
    : { ok: false, message: `${label} contains unsupported characters` };
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
  const apiKey = env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, message: "DEEPGRAM_API_KEY is not set" };
  }

  const model = optionalIdentifier(env.PI_DICTATE_MODEL, "nova-3", MODEL_PATTERN, "PI_DICTATE_MODEL");
  if (typeof model !== "string") return model;

  const language = optionalIdentifier(env.PI_DICTATE_LANGUAGE, "en", LANGUAGE_PATTERN, "PI_DICTATE_LANGUAGE");
  if (typeof language !== "string") return language;

  const endpoint = new URL("wss://api.deepgram.com/v1/listen");
  endpoint.search = new URLSearchParams({
    model,
    language,
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
    interim_results: "false",
    smart_format: "true",
    punctuate: "true",
    endpointing: "300",
  }).toString();

  return { ok: true, value: { apiKey, endpoint } };
}

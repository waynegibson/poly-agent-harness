/** Thin, abortable client for the oMLX Admin API. */

import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 10_000;
const CONFIG_PATH = join(getAgentDir(), "omlx-control.json");

interface OmlxControlConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

function loadConfig(): OmlxControlConfig {
  if (!existsSync(CONFIG_PATH)) return {};

  try {
    const value: unknown = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("expected a JSON object");
    }
    const config = value as Record<string, unknown>;
    if (config.baseUrl !== undefined && typeof config.baseUrl !== "string") {
      throw new Error("baseUrl must be a string");
    }
    if (
      config.timeoutMs !== undefined &&
      (typeof config.timeoutMs !== "number" ||
        !Number.isFinite(config.timeoutMs))
    ) {
      throw new Error("timeoutMs must be a finite number");
    }
    return config as OmlxControlConfig;
  } catch (error) {
    throw new Error(
      `Invalid oMLX control config at ${CONFIG_PATH}: ${errorMessage(error)}`,
    );
  }
}

const config = loadConfig();

export interface OmlxSettings {
  active_profile_name?: string | null;
  temperature?: number | null;
  top_p?: number | null;
  top_k?: number | null;
  min_p?: number | null;
  repetition_penalty?: number | null;
  enable_thinking?: boolean | null;
  thinking_budget_tokens?: number | null;
  reasoning_parser?: string | null;
  max_context_window?: number | null;
  max_tokens?: number | null;
  max_tool_result_tokens?: number | null;
  mtp_enabled?: boolean | null;
  turboquant_kv_enabled?: boolean | null;
  dflash_enabled?: boolean | null;
  specprefill_enabled?: boolean | null;
}

export interface OmlxModel {
  id: string;
  display_name?: string | null;
  model_type?: string | null;
  engine_type?: string | null;
  model_context_length?: number | null;
  estimated_size_formatted?: string | null;
  actual_size_formatted?: string | null;
  is_loading?: boolean;
  loaded: boolean;
  is_default: boolean;
  is_hidden: boolean;
  is_helper: boolean;
  is_favorite?: boolean;
  settings: OmlxSettings;
}

export interface OmlxProfile {
  name: string;
  display_name?: string | null;
  description?: string | null;
  settings: OmlxSettings;
}

export interface OmlxApplyResult {
  model_id: string;
  settings: OmlxSettings;
  model_type?: string;
  engine_type?: string;
  requires_reload?: boolean;
  auto_unloaded?: boolean;
  auto_reloaded?: boolean;
}

function baseUrl(): string {
  return (
    process.env.OMLX_BASE_URL?.trim() ||
    config.baseUrl?.trim() ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
}

function timeoutMs(): number {
  const raw =
    process.env.OMLX_REQUEST_TIMEOUT_MS ??
    config.timeoutMs ??
    DEFAULT_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  if (value > 60_000) {
    console.warn(
      `omlx-control: timeoutMs ${value} exceeds 60s cap, using 60000`,
    );
    return 60_000;
  }
  return value;
}

function apiUrl(path: string): string {
  return new URL(path, `${baseUrl()}/`).toString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs());
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const url = apiUrl(path);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: combinedSignal });
  } catch (error) {
    throw new Error(
      `Could not reach oMLX at ${baseUrl()}: ${errorMessage(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `oMLX API error (${response.status} ${response.statusText}) at ${url}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error(`Invalid JSON from oMLX at ${url}: ${errorMessage(error)}`);
  }
}

export async function listModels(signal?: AbortSignal): Promise<OmlxModel[]> {
  const data = await request<{ models?: unknown }>(
    "/admin/api/models",
    {},
    signal,
  );
  if (!Array.isArray(data.models))
    throw new Error("Invalid oMLX response: expected a models array.");
  return data.models as OmlxModel[];
}

export async function listProfiles(
  modelId: string,
  signal?: AbortSignal,
): Promise<OmlxProfile[]> {
  const path = `/admin/api/models/${encodeURIComponent(modelId)}/profiles`;
  const data = await request<{ profiles?: unknown }>(path, {}, signal);
  if (!Array.isArray(data.profiles))
    throw new Error("Invalid oMLX response: expected a profiles array.");
  return data.profiles as OmlxProfile[];
}

export async function applyProfile(
  modelId: string,
  profileName: string,
  signal?: AbortSignal,
): Promise<OmlxApplyResult> {
  const path = `/admin/api/models/${encodeURIComponent(modelId)}/profiles/${encodeURIComponent(profileName)}/apply`;
  return request<OmlxApplyResult>(path, { method: "POST" }, signal);
}
